import {
  API_VERSION,
  MAX_IMAGE_BYTES,
  analyzeLabelRequestSchema,
  labelReadingSchema,
  type AnalyzeLabelResponse,
} from '../../src/schemas/api.js';
import type { ServerEnv } from './env.js';
import { ApiError, errorResponse, jsonResponse } from './errors.js';
import { decodeImage } from './imageGuard.js';
import type { RequestLogger } from './logger.js';
import { isOriginAllowed } from './origin.js';
import type { RateLimiter } from './rateLimit.js';
import type { VisionProvider } from './visionProvider.js';

// The whole POST /api/analyze-label as a function from Request to Response, with everything
// outside (environment, AI service, limiter, clock, logger) passed in. The host entry file
// api/analyze-label.ts only wires the real parts; the tests wire fakes.
//
// Order (docs/architecture/API.md): method, Origin, limits, size of the body, JSON, schema, the bytes of the
// photo, the AI, the schema of the answer. The limits are checked before anything is read or sent.

// A photo of MAX_IMAGE_BYTES is about 2.0 million base64 characters; the rest is the JSON frame.
const MAX_BODY_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1_000;

export type HandlerDeps = {
  readEnv: () => ServerEnv;
  /** null when the service cannot be used (no key or no model). */
  createProvider: (env: ServerEnv) => VisionProvider | null;
  limiter: RateLimiter;
  /** Turns an address into a hash; the limiter never sees the address itself. */
  hashIp: (ip: string) => string;
  logger: RequestLogger;
  now: () => number;
  newId: () => string;
};

function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first ? first : 'unknown';
}

async function readBody(request: Request): Promise<string> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_CHARS) throw new ApiError('IMAGE_TOO_LARGE');
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) throw new ApiError('IMAGE_TOO_LARGE');
  if (text.trim() === '') throw new ApiError('BAD_REQUEST');
  return text;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('BAD_REQUEST');
  }
}

/** The model is asked for bare JSON; a single code fence around it is tolerated, nothing else. */
function modelJson(text: string): unknown {
  let body = text.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/.exec(body);
  if (fenced?.[1] !== undefined) body = fenced[1].trim();
  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError('AI_BAD_RESPONSE');
  }
}

export function createAnalyzeLabelHandler(deps: HandlerDeps) {
  async function run(request: Request): Promise<Response> {
    if (request.method !== 'POST') throw new ApiError('METHOD_NOT_ALLOWED');

    const env = deps.readEnv();
    if (!isOriginAllowed(request.headers.get('origin'), env.allowedOrigins)) {
      throw new ApiError('ORIGIN_NOT_ALLOWED');
    }

    const decision = await deps.limiter.check(deps.hashIp(clientIp(request)), {
      perHour: env.perHourLimit,
      daily: env.dailyLimit,
    });
    if (!decision.ok) throw new ApiError('RATE_LIMITED', decision.retryAfterSeconds);

    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      throw new ApiError('BAD_REQUEST');
    }
    const parsed = analyzeLabelRequestSchema.safeParse(parseJson(await readBody(request)));
    if (!parsed.success) throw new ApiError('BAD_REQUEST');

    // the photo itself: size after decoding, and the real format by its first bytes
    decodeImage(parsed.data.imageBase64, parsed.data.mediaType);

    const provider = deps.createProvider(env);
    if (!provider) throw new ApiError('AI_UNAVAILABLE');

    const answer = await provider.readLabel({
      base64: parsed.data.imageBase64,
      mediaType: parsed.data.mediaType,
    });
    const reading = labelReadingSchema.safeParse(modelJson(answer));
    if (!reading.success) throw new ApiError('AI_BAD_RESPONSE');

    const ingredientsText = reading.data.ingredientsText?.trim() ?? '';
    if (ingredientsText === '') throw new ApiError('NO_INGREDIENTS_FOUND');

    const body: AnalyzeLabelResponse = {
      apiVersion: API_VERSION,
      ...reading.data,
      ingredientsText,
    };
    return jsonResponse(200, body);
  }

  return async function handle(request: Request): Promise<Response> {
    const started = deps.now();
    const requestId = deps.newId();
    let code = 'OK';
    let limited = false;
    let response: Response;

    try {
      response = await run(request);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('INTERNAL');
      code = apiError.code;
      limited = apiError.code === 'RATE_LIMITED';
      response = errorResponse(apiError);
    }

    deps.logger.log({ requestId, code, durationMs: Math.max(0, deps.now() - started), limited });
    return response;
  };
}
