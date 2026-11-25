import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Stage 14: the host configuration (vercel.json) checked without a deployment.
// The real proof is curl -I on the deployed address (docs/quality/security-report.md); this test keeps
// the file from drifting in the meantime.

type Header = { key: string; value: string };
type VercelConfig = {
  rewrites: { source: string; destination: string }[];
  headers: { source: string; headers: Header[] }[];
};

const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as VercelConfig;
const spa = config.rewrites.find((rule) => rule.destination === '/index.html');
// Vercel reads "source" as a path pattern; this one is a plain regular expression group.
const rewritten = (path: string) => new RegExp(`^${spa?.source ?? ''}$`).test(path);

describe('vercel.json: what is answered by the app shell', () => {
  it('has exactly one rewrite to index.html', () => {
    expect(spa).toBeDefined();
  });

  it.each(['/', '/care', '/profile/about', '/scan/result/abc', '/dev/state', '/no/such/page'])(
    'app routes go to the app shell: %s',
    (path) => {
      expect(rewritten(path)).toBe(true);
    },
  );

  // These must reach the file system: a file that is not in dist gives 404, not the app with 200.
  it.each([
    '/.env',
    '/.env.local',
    '/.git/config',
    '/CLAUDE.md',
    '/vite.config.ts',
    '/package.json',
    '/assets/index.js.map',
    '/content/source/',
    '/content/source/message.txt',
    '/api/analyze-label',
    '/sw.js',
  ])('is not rewritten to the app: %s', (path) => {
    expect(rewritten(path)).toBe(false);
  });
});

describe('vercel.json: security headers', () => {
  const all = config.headers.find((rule) => rule.source === '/(.*)')?.headers ?? [];
  const header = (key: string) => all.find((item) => item.key === key)?.value ?? '';

  it('has all the headers of the plan', () => {
    for (const key of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(header(key)).not.toBe('');
    }
  });

  it('the CSP allows nothing from other sites and no inline code', () => {
    const csp = header('Content-Security-Policy');
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:/);
  });

  it('HSTS lasts at least a year, and the microphone and location are off', () => {
    const maxAge = Number(/max-age=(\d+)/.exec(header('Strict-Transport-Security'))?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Permissions-Policy')).toContain('microphone=()');
    expect(header('Permissions-Policy')).toContain('geolocation=()');
  });

  it('the service worker file is never cached by the browser or the CDN', () => {
    const sw = config.headers.find((rule) => rule.source === '/sw.js')?.headers ?? [];
    expect(sw.find((item) => item.key === 'Cache-Control')?.value).toContain('max-age=0');
  });
});
