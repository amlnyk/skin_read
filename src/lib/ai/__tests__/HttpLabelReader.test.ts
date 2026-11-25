// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { API_VERSION } from '@/schemas';
import { createHttpLabelReader } from '../HttpLabelReader';

const photo = (type = 'image/jpeg') =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type });

const answer = (patch: Record<string, unknown> = {}) => ({
  apiVersion: API_VERSION,
  productName: 'Calm cream',
  brand: 'Test brand',
  categoryGuess: 'moisturizer',
  ingredientsText: 'Aqua, Glycerin, Panthenol',
  language: 'en',
  confidence: 0.9,
  ...patch,
});

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const errorBody = (code: string) => ({ error: { code, message: 'x' } });

type Seen = { url: string; init: RequestInit };

function readerWith(respond: (seen: Seen) => Promise<Response>, timeoutMs?: number) {
  const seen: Seen[] = [];
  const reader = createHttpLabelReader({
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    fetchImpl: (url, init) => {
      const entry = { url, init };
      seen.push(entry);
      return respond(entry);
    },
  });
  return { reader, seen };
}

describe('the label reader over HTTP', () => {
  it('sends the photo as base64 with its type and gives back the reading', async () => {
    const { reader, seen } = readerWith(() => json(answer()));
    const result = await reader.analyze(photo());
    expect(result).toEqual({
      ok: true,
      value: {
        ingredientsText: 'Aqua, Glycerin, Panthenol',
        productName: 'Calm cream',
        brand: 'Test brand',
        categoryGuess: 'moisturizer',
        language: 'en',
        confidence: 0.9,
      },
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe('/api/analyze-label');
    expect(seen[0]?.init.method).toBe('POST');
    const body = JSON.parse(String(seen[0]?.init.body)) as {
      imageBase64: string;
      mediaType: string;
    };
    expect(body.mediaType).toBe('image/jpeg');
    expect(body.imageBase64).toBe('/9j/4AECAw==');
  });

  it('does not send a file that is not a picture of an allowed type', async () => {
    const { reader, seen } = readerWith(() => json(answer()));
    const result = await reader.analyze(photo('image/gif'));
    expect(result).toEqual({ ok: false, error: { code: 'UNSUPPORTED_FORMAT' } });
    expect(seen).toHaveLength(0);
  });

  it('a large photo is encoded without overflowing the call stack', async () => {
    const { reader } = readerWith(() => json(answer()));
    const big = new Blob([new Uint8Array(1_400_000)], { type: 'image/jpeg' });
    const result = await reader.analyze(big);
    expect(result.ok).toBe(true);
  });

  it('an answer that is not JSON is a bad response', async () => {
    const { reader } = readerWith(() =>
      Promise.resolve(new Response('<html>oops</html>', { status: 200 })),
    );
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } });
  });

  it('an answer of the wrong shape is a bad response', async () => {
    const { reader } = readerWith(() => json({ hello: 'world' }));
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } });
  });

  it('an answer of another version is a bad response', async () => {
    const { reader } = readerWith(() => json(answer({ apiVersion: 99 })));
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } });
  });

  it('no text of the composition (null or blank) means nothing was found', async () => {
    for (const ingredientsText of [null, '', '   ']) {
      const { reader } = readerWith(() => json(answer({ ingredientsText })));
      expect(await reader.analyze(photo())).toEqual({
        ok: false,
        error: { code: 'NO_INGREDIENTS_FOUND' },
      });
    }
  });

  it('takes the codes of the server', async () => {
    const cases: [string, number, string][] = [
      ['RATE_LIMITED', 429, 'RATE_LIMITED'],
      ['IMAGE_TOO_LARGE', 413, 'IMAGE_TOO_LARGE'],
      ['UNSUPPORTED_FORMAT', 415, 'UNSUPPORTED_FORMAT'],
      ['NO_INGREDIENTS_FOUND', 422, 'NO_INGREDIENTS_FOUND'],
      ['BAD_REQUEST', 400, 'BAD_REQUEST'],
      ['AI_BAD_RESPONSE', 502, 'BAD_RESPONSE'],
      ['AI_UNAVAILABLE', 503, 'UNAVAILABLE'],
      ['TIMEOUT', 504, 'TIMEOUT'],
      ['ORIGIN_NOT_ALLOWED', 403, 'UNAVAILABLE'],
      ['METHOD_NOT_ALLOWED', 405, 'UNAVAILABLE'],
      ['INTERNAL', 500, 'UNAVAILABLE'],
    ];
    for (const [server, status, expected] of cases) {
      const { reader } = readerWith(() => json(errorBody(server), status));
      expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: expected } });
    }
  });

  it('a bare 429 (not our body) is still "too many"', async () => {
    const { reader } = readerWith(() =>
      Promise.resolve(new Response('slow down', { status: 429 })),
    );
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'RATE_LIMITED' } });
  });

  it('a host error page or a missing function is "unavailable"', async () => {
    for (const status of [404, 500, 502]) {
      const { reader } = readerWith(() => Promise.resolve(new Response('<h1>no</h1>', { status })));
      expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'UNAVAILABLE' } });
    }
  });

  it('offline: the request fails and it is a network error, not a crash', async () => {
    const { reader } = readerWith(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'NETWORK' } });
  });

  it('gives up after the timeout and cancels the request', async () => {
    let aborted = false;
    const { reader } = readerWith(
      ({ init }) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
      20,
    );
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'TIMEOUT' } });
    expect(aborted).toBe(true);
  });

  it('never throws, whatever fetch does', async () => {
    const { reader } = readerWith(() => {
      throw new Error('boom');
    });
    expect(await reader.analyze(photo())).toEqual({ ok: false, error: { code: 'NETWORK' } });
  });
});
