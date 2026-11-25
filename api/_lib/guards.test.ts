// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULTS, readServerEnv } from './env.js';
import { ApiError, errorResponse, STATUS } from './errors.js';
import { decodeImage, sniffImageType } from './imageGuard.js';
import { createConsoleRequestLogger } from './logger.js';
import { isOriginAllowed } from './origin.js';
import { createMemoryRateLimiter } from './rateLimit.js';
import { JPEG, PNG, WEBP, toBase64 } from './testKit.js';

describe('sniffImageType', () => {
  it('knows JPEG, PNG and WebP by their first bytes', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(WEBP)).toBe('image/webp');
  });

  it('knows nothing else: text, GIF, PDF, an HTML page, a short or empty file', () => {
    const bytes = (text: string) => new TextEncoder().encode(text);
    for (const sample of [
      bytes('hello'),
      bytes('GIF89a....'),
      bytes('%PDF-1.7'),
      bytes('<html><script>'),
      new Uint8Array([0xff, 0xd8]),
      new Uint8Array(),
    ]) {
      expect(sniffImageType(sample)).toBeNull();
    }
  });
});

describe('decodeImage', () => {
  const codeOf = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      return error instanceof ApiError ? error.code : 'OTHER';
    }
    return 'NONE';
  };

  it('returns the bytes of a photo that is what it says', () => {
    expect([...decodeImage(toBase64(JPEG), 'image/jpeg')]).toEqual([...JPEG]);
  });

  it('refuses a photo over the limit from the length of the text, before decoding', () => {
    expect(codeOf(() => decodeImage('A'.repeat(4_000), 'image/jpeg', 1_000))).toBe(
      'IMAGE_TOO_LARGE',
    );
  });

  it('counts padding: 2 bytes of data in 4 characters are not "3"', () => {
    expect(codeOf(() => decodeImage(toBase64(new Uint8Array([0xff, 0xd8])), 'image/jpeg', 2))).toBe(
      'UNSUPPORTED_FORMAT',
    );
    expect(codeOf(() => decodeImage(toBase64(JPEG), 'image/jpeg', JPEG.length - 1))).toBe(
      'IMAGE_TOO_LARGE',
    );
  });

  it('BAD_REQUEST for text that is not base64 and for an empty one', () => {
    expect(codeOf(() => decodeImage('not base64!', 'image/jpeg'))).toBe('BAD_REQUEST');
    expect(codeOf(() => decodeImage('', 'image/jpeg'))).toBe('BAD_REQUEST');
  });

  it('UNSUPPORTED_FORMAT when the bytes are another format than declared', () => {
    expect(codeOf(() => decodeImage(toBase64(PNG), 'image/jpeg'))).toBe('UNSUPPORTED_FORMAT');
  });
});

describe('isOriginAllowed', () => {
  const allowed = ['https://app.example', 'https://*.preview.example', 'http://localhost:3000'];

  it('lets in the exact origins and the subdomains of a wildcard', () => {
    expect(isOriginAllowed('https://app.example', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
    expect(isOriginAllowed('https://a.preview.example', allowed)).toBe(true);
    expect(isOriginAllowed('https://a.b.preview.example', allowed)).toBe(true);
  });

  it('keeps out everything else', () => {
    for (const origin of [
      null,
      '',
      'null',
      'https://evil.example',
      'http://app.example',
      'https://app.example:8443',
      'https://preview.example',
      'https://evilpreview.example',
      'https://a.preview.example.evil.example',
      'https://app.example/path',
      'ftp://app.example',
      'not a url',
    ]) {
      expect(isOriginAllowed(origin, allowed)).toBe(false);
    }
  });

  it('a bare star and a star in the middle of a name never let anyone in', () => {
    expect(isOriginAllowed('https://anything.example', ['*'])).toBe(false);
    expect(isOriginAllowed('https://anything.example', ['https://*'])).toBe(false);
    expect(isOriginAllowed('https://anything.example', ['https://any*.example'])).toBe(false);
    expect(isOriginAllowed('https://a.com', ['https://*.com'])).toBe(false);
  });
});

describe('createMemoryRateLimiter', () => {
  const limits = { perHour: 2, daily: 5 };

  it('lets two through per hour and tells when to come back', async () => {
    const clock = { now: 0 };
    const limiter = createMemoryRateLimiter({ now: () => clock.now });
    expect(await limiter.check('a', limits)).toEqual({ ok: true });
    clock.now = 600_000;
    expect(await limiter.check('a', limits)).toEqual({ ok: true });
    expect(await limiter.check('a', limits)).toEqual({ ok: false, retryAfterSeconds: 3_000 });
  });

  it('the hour slides: after the first request is an hour old there is room again', async () => {
    const clock = { now: 0 };
    const limiter = createMemoryRateLimiter({ now: () => clock.now });
    await limiter.check('a', limits);
    clock.now = 1_000;
    await limiter.check('a', limits);
    clock.now = 3_600_000;
    expect((await limiter.check('a', limits)).ok).toBe(true);
  });

  it('a request that was refused does not extend the wait', async () => {
    const clock = { now: 0 };
    const limiter = createMemoryRateLimiter({ now: () => clock.now });
    await limiter.check('a', limits);
    await limiter.check('a', limits);
    clock.now = 1_800_000;
    await limiter.check('a', limits);
    clock.now = 3_600_000;
    expect((await limiter.check('a', limits)).ok).toBe(true);
  });

  it('the day limit is shared by all clients and starts again at midnight UTC', async () => {
    const clock = { now: 20 * 3_600_000 };
    const limiter = createMemoryRateLimiter({ now: () => clock.now });
    for (const key of ['a', 'b', 'c', 'd', 'e'])
      expect((await limiter.check(key, limits)).ok).toBe(true);
    const refused = await limiter.check('f', limits);
    expect(refused).toEqual({ ok: false, retryAfterSeconds: 4 * 3_600 });
    clock.now = 24 * 3_600_000 + 1;
    expect((await limiter.check('f', limits)).ok).toBe(true);
  });

  it('a client refused by its own limit does not use up the day', async () => {
    const limiter = createMemoryRateLimiter({ now: () => 0 });
    await limiter.check('a', { perHour: 1, daily: 2 });
    await limiter.check('a', { perHour: 1, daily: 2 });
    expect((await limiter.check('b', { perHour: 1, daily: 2 })).ok).toBe(true);
  });

  it('forgets the oldest clients when there are too many', async () => {
    const limiter = createMemoryRateLimiter({ now: () => 0, maxKeys: 2 });
    const one = { perHour: 1, daily: 100 };
    await limiter.check('a', one);
    await limiter.check('b', one);
    await limiter.check('c', one);
    // "a" was forgotten, so it starts from zero; "c" is still remembered
    expect((await limiter.check('a', one)).ok).toBe(true);
    expect((await limiter.check('c', one)).ok).toBe(false);
  });
});

describe('readServerEnv', () => {
  it('reads the names and the numbers', () => {
    const env = readServerEnv({
      ANTHROPIC_API_KEY: ' key ',
      ANTHROPIC_MODEL: 'm',
      ALLOWED_ORIGINS: 'https://a.example, https://*.b.example ,, ',
      RATE_LIMIT_PER_HOUR: '5',
      DAILY_LIMIT: '50',
      MODEL_TIMEOUT_MS: '9000',
    });
    expect(env).toEqual({
      apiKey: 'key',
      model: 'm',
      allowedOrigins: ['https://a.example', 'https://*.b.example'],
      perHourLimit: 5,
      dailyLimit: 50,
      modelTimeoutMs: 9000,
    });
  });

  it('the starting limits are 10 an hour and 200 a day; broken numbers fall back to them', () => {
    expect(DEFAULTS).toMatchObject({ perHourLimit: 10, dailyLimit: 200 });
    for (const bad of ['', 'abc', '0', '-3', '2.5', undefined]) {
      const env = readServerEnv({ RATE_LIMIT_PER_HOUR: bad, DAILY_LIMIT: bad });
      expect([env.perHourLimit, env.dailyLimit]).toEqual([10, 200]);
    }
  });

  it('nothing set means no key, no model and nobody allowed', () => {
    expect(readServerEnv({})).toMatchObject({ apiKey: null, model: null, allowedOrigins: [] });
    expect(readServerEnv({ ANTHROPIC_API_KEY: '   ' }).apiKey).toBeNull();
  });
});

describe('errorResponse', () => {
  it('has a status and a general text for every code, and Retry-After only for the limit', async () => {
    for (const [code, status] of Object.entries(STATUS)) {
      const response = errorResponse(new ApiError(code as keyof typeof STATUS));
      expect(response.status).toBe(status);
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe(code);
      expect(body.error.message.length).toBeGreaterThan(0);
    }
    expect(errorResponse(new ApiError('RATE_LIMITED', 12.2)).headers.get('retry-after')).toBe('13');
    expect(errorResponse(new ApiError('RATE_LIMITED', 0)).headers.get('retry-after')).toBe('1');
    expect(errorResponse(new ApiError('BAD_REQUEST')).headers.get('retry-after')).toBeNull();
  });
});

describe('createConsoleRequestLogger', () => {
  it('writes one JSON line: info for OK, warn for the rest', () => {
    const lines: string[] = [];
    const logger = createConsoleRequestLogger({
      info: (line) => lines.push(`i ${line}`),
      warn: (line) => lines.push(`w ${line}`),
    });
    logger.log({ requestId: 'r1', code: 'OK', durationMs: 5, limited: false });
    logger.log({ requestId: 'r2', code: 'RATE_LIMITED', durationMs: 1, limited: true });
    expect(lines).toEqual([
      'i {"requestId":"r1","code":"OK","durationMs":5,"limited":false}',
      'w {"requestId":"r2","code":"RATE_LIMITED","durationMs":1,"limited":true}',
    ]);
  });
});
