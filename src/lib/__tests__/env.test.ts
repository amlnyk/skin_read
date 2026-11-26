import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('uses safe defaults when nothing is set', () => {
    const result = parseEnv({});
    expect(result).toEqual({
      ok: true,
      value: {
        appEnv: 'development',
        contentPolicy: 'demo',
        freshStart: false,
        features: { photoScan: false, simplifyAI: false },
      },
    });
  });

  it('treats empty strings (as in .env.example) as not set', () => {
    const result = parseEnv({ VITE_CONTENT_POLICY: '', VITE_FEATURE_PHOTO_SCAN: '  ' });
    expect(result.ok).toBe(true);
  });

  it('reads valid values', () => {
    const result = parseEnv({
      VITE_APP_ENV: 'production',
      VITE_CONTENT_POLICY: 'public',
      VITE_FEATURE_PHOTO_SCAN: 'true',
      VITE_FEATURE_SIMPLIFY_AI: 'false',
      VITE_FRESH_START: 'true',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        appEnv: 'production',
        contentPolicy: 'public',
        freshStart: true,
        features: { photoScan: true, simplifyAI: false },
      },
    });
  });

  it('reports the names of broken variables, not their values', () => {
    const result = parseEnv({
      VITE_CONTENT_POLICY: 'secret-value',
      VITE_FEATURE_PHOTO_SCAN: 'yes',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_ENV');
      expect([...result.error.variables].sort()).toEqual([
        'VITE_CONTENT_POLICY',
        'VITE_FEATURE_PHOTO_SCAN',
      ]);
      expect(JSON.stringify(result.error)).not.toContain('secret-value');
    }
  });

  it('ignores variables that are not ours', () => {
    expect(parseEnv({ SOMETHING_ELSE: 'x', MODE: 'test' }).ok).toBe(true);
  });
});
