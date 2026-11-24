import type { Env } from '@/lib/env';

// Built once at startup from validated env (see lib/env.ts).
export function createAppConfig(env: Env) {
  return {
    appName: 'Skin Barrier',
    // 'demo' shows verified + draft content, 'public' shows verified only.
    CONTENT_POLICY: env.contentPolicy,
    features: env.features,
    schemaVersion: 1,
  } as const;
}

export type AppConfig = ReturnType<typeof createAppConfig>;
