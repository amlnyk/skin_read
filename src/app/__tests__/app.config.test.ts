import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';
import { createAppConfig } from '../app.config';

describe('createAppConfig', () => {
  it('takes content policy and feature flags from the validated env', () => {
    const env = parseEnv({ VITE_CONTENT_POLICY: 'public', VITE_FEATURE_PHOTO_SCAN: 'true' });
    if (!env.ok) throw new Error('test env must be valid');
    const config = createAppConfig(env.value);
    expect(config.CONTENT_POLICY).toBe('public');
    expect(config.features.photoScan).toBe(true);
    expect(config.features.simplifyAI).toBe(false);
    expect(config.schemaVersion).toBe(1);
  });
});
