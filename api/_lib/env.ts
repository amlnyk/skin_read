// Settings of the server function, read from environment variables (set in the host, never in
// the code or the repository). Missing or broken numbers fall back to safe defaults.

export type ServerEnv = {
  /** null: the key is not set, so the recognition is "unavailable" (the app still works). */
  readonly apiKey: string | null;
  /** null: no model is named, so the recognition is "unavailable". */
  readonly model: string | null;
  readonly allowedOrigins: readonly string[];
  readonly perHourLimit: number;
  readonly dailyLimit: number;
  /** How long the function waits for the model. Shorter than the client's 20 s. */
  readonly modelTimeoutMs: number;
};

export const DEFAULTS = {
  perHourLimit: 10,
  dailyLimit: 200,
  modelTimeoutMs: 15_000,
} as const;

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value?.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readServerEnv(raw: Readonly<Record<string, string | undefined>>): ServerEnv {
  return {
    apiKey: text(raw['ANTHROPIC_API_KEY']),
    model: text(raw['ANTHROPIC_MODEL']),
    allowedOrigins: (raw['ALLOWED_ORIGINS'] ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
    perHourLimit: positiveInt(raw['RATE_LIMIT_PER_HOUR'], DEFAULTS.perHourLimit),
    dailyLimit: positiveInt(raw['DAILY_LIMIT'], DEFAULTS.dailyLimit),
    modelTimeoutMs: positiveInt(raw['MODEL_TIMEOUT_MS'], DEFAULTS.modelTimeoutMs),
  };
}
