import { randomUUID, createHash } from 'node:crypto';
import { readServerEnv, type ServerEnv } from './_lib/env.js';
import { createAnalyzeLabelHandler } from './_lib/handler.js';
import { createConsoleRequestLogger } from './_lib/logger.js';
import { createMemoryRateLimiter } from './_lib/rateLimit.js';
import { createAnthropicProvider } from './_lib/visionProvider.js';

// POST /api/analyze-label: a photo of a label in, the text of the composition out.
// The contract is in docs/architecture/API.md. Everything that can be tested lives in ./_lib; this file only
// connects the real parts (environment variables, the AI service, the clock).

// The host may run this function for 20 seconds (vercel.json, "functions"). The function waits
// for the model for 15 seconds, so it answers TIMEOUT before the 20 seconds the app waits.

// A random salt per instance: an address is hashed with it, so the limiter can count a client
// without ever keeping the address.
const salt = randomUUID();
const hashIp = (ip: string) => createHash('sha256').update(`${salt}:${ip}`).digest('hex');

const handler = createAnalyzeLabelHandler({
  readEnv: () => readServerEnv(process.env),
  createProvider: (env: ServerEnv) =>
    env.apiKey && env.model
      ? createAnthropicProvider({
          apiKey: env.apiKey,
          model: env.model,
          timeoutMs: env.modelTimeoutMs,
        })
      : null,
  limiter: createMemoryRateLimiter({ now: () => Date.now() }),
  hashIp,
  logger: createConsoleRequestLogger(),
  now: () => Date.now(),
  newId: () => randomUUID(),
});

// Every method goes to the same handler, which answers 405 to anything but POST.
export const POST = handler;
export const GET = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
