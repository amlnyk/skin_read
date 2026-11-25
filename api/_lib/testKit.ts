import type { ServerEnv } from './env.js';
import { createAnalyzeLabelHandler, type HandlerDeps } from './handler.js';
import type { RequestLogEvent } from './logger.js';
import { createMemoryRateLimiter } from './rateLimit.js';
import type { VisionInput, VisionProvider } from './visionProvider.js';

// Helpers shared by the tests of the server function. Nothing here calls a real service.

export const ORIGIN = 'https://app.example';

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0]);
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
export const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

export const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

export const baseEnv: ServerEnv = {
  apiKey: 'test-key-never-shown',
  model: 'test-model',
  allowedOrigins: [ORIGIN, 'https://*.preview.example'],
  perHourLimit: 10,
  dailyLimit: 200,
  modelTimeoutMs: 15_000,
};

export const goodReading = {
  productName: 'Test cream',
  brand: 'Test brand',
  categoryGuess: 'moisturizer',
  ingredientsText: 'Aqua, Glycerin, Panthenol',
  language: 'en',
  confidence: 0.9,
};

export function requestFor(
  body: unknown,
  options: {
    method?: string;
    origin?: string | null;
    contentType?: string | null;
    ip?: string;
  } = {},
): Request {
  const headers: Record<string, string> = {};
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin !== null) headers['origin'] = origin;
  const contentType = options.contentType === undefined ? 'application/json' : options.contentType;
  if (contentType !== null) headers['content-type'] = contentType;
  headers['x-real-ip'] = options.ip ?? '203.0.113.7';
  const method = options.method ?? 'POST';
  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request('https://app.example/api/analyze-label', init);
}

export const photoBody = (bytes: Uint8Array = JPEG, mediaType = 'image/jpeg') => ({
  imageBase64: toBase64(bytes),
  mediaType,
});

export type Rig = {
  handle: (request: Request) => Promise<Response>;
  calls: VisionInput[];
  logs: RequestLogEvent[];
  clock: { now: number };
};

/** The handler with a fake AI. `answer` is what the model "says", or a function that throws. */
export function makeRig(
  answer: string | (() => string | Promise<string>) = JSON.stringify(goodReading),
  overrides: Partial<HandlerDeps> & { env?: Partial<ServerEnv> } = {},
): Rig {
  const calls: VisionInput[] = [];
  const logs: RequestLogEvent[] = [];
  const clock = { now: 1_000_000 };
  const provider: VisionProvider = {
    async readLabel(input) {
      calls.push(input);
      return typeof answer === 'function' ? answer() : answer;
    },
  };
  const { env: envOverrides, ...rest } = overrides;
  const env = { ...baseEnv, ...envOverrides };
  const handle = createAnalyzeLabelHandler({
    readEnv: () => env,
    createProvider: (current) => (current.apiKey && current.model ? provider : null),
    limiter: createMemoryRateLimiter({ now: () => clock.now }),
    hashIp: (ip) => `hash:${ip}`,
    logger: { log: (event) => logs.push(event) },
    now: () => clock.now,
    newId: () => 'request-id',
    ...rest,
  });
  return { handle, calls, logs, clock };
}
