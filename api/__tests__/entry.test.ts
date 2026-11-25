// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, OPTIONS, PATCH, POST, PUT } from '../analyze-label.js';
import { ORIGIN, photoBody, requestFor } from '../_lib/__tests__/testKit.js';

// The file the host runs: the real wiring over the environment variables. No key is set, so
// the AI is never reached; the answers prove that the parts are connected in the right order.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('api/analyze-label.ts', () => {
  it('answers 403 until an origin is allowed in the environment', async () => {
    vi.stubEnv('ALLOWED_ORIGINS', '');
    expect((await POST(requestFor(photoBody()))).status).toBe(403);
  });

  it('with an allowed origin but no key it says the service is unavailable', async () => {
    vi.stubEnv('ALLOWED_ORIGINS', ORIGIN);
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('ANTHROPIC_MODEL', 'some-model');
    const response = await POST(requestFor(photoBody(), { ip: '198.51.100.20' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: 'AI_UNAVAILABLE', message: expect.any(String) as string },
    });
  });

  it('every other method gets 405', async () => {
    for (const method of [GET, PUT, PATCH, DELETE, OPTIONS]) {
      expect((await method(requestFor('', { method: 'GET' }))).status).toBe(405);
    }
  });
});
