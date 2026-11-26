import { z } from 'zod';
import { contentPolicySchema, type ContentPolicy } from '@/schemas';
import { err, ok, type Result } from './result';

// Validation of VITE_* variables at startup. They are public (they end up in the bundle),
// so there are no secrets here. Unset or empty values fall back to safe defaults.

const flagSchema = z.enum(['true', 'false']);

const rawEnvSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
  VITE_CONTENT_POLICY: contentPolicySchema.default('demo'),
  VITE_FEATURE_PHOTO_SCAN: flagSchema.default('false'),
  VITE_FEATURE_SIMPLIFY_AI: flagSchema.default('false'),
  // Review mode: nothing is saved between visits, so every visit starts from the loading
  // screen and the onboarding (decision 2026-11-26). On Vercel it is on unless set to false.
  VITE_FRESH_START: flagSchema.default('false'),
});

export type Env = {
  readonly appEnv: 'development' | 'preview' | 'production';
  readonly contentPolicy: ContentPolicy;
  /** Keep the data in memory only: each visit starts from scratch (review mode). */
  readonly freshStart: boolean;
  readonly features: {
    readonly photoScan: boolean;
    readonly simplifyAI: boolean;
  };
};

export type EnvError = {
  readonly code: 'INVALID_ENV';
  /** Names of the broken variables (never their values). */
  readonly variables: readonly string[];
};

const KEYS = [
  'VITE_APP_ENV',
  'VITE_CONTENT_POLICY',
  'VITE_FEATURE_PHOTO_SCAN',
  'VITE_FEATURE_SIMPLIFY_AI',
  'VITE_FRESH_START',
] as const;

// An empty value (as in .env.example) counts as "not set".
function cleanEnv(raw: Readonly<Record<string, unknown>>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const key of KEYS) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') {
      cleaned[key] = value.trim();
    } else if (value !== undefined && typeof value !== 'string') {
      cleaned[key] = String(value);
    }
  }
  return cleaned;
}

export function parseEnv(raw: Readonly<Record<string, unknown>>): Result<Env, EnvError> {
  const parsed = rawEnvSchema.safeParse(cleanEnv(raw));
  if (!parsed.success) {
    const variables = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    return err({ code: 'INVALID_ENV', variables });
  }
  const data = parsed.data;
  return ok({
    appEnv: data.VITE_APP_ENV,
    contentPolicy: data.VITE_CONTENT_POLICY,
    freshStart: data.VITE_FRESH_START === 'true',
    features: {
      photoScan: data.VITE_FEATURE_PHOTO_SCAN === 'true',
      simplifyAI: data.VITE_FEATURE_SIMPLIFY_AI === 'true',
    },
  });
}
