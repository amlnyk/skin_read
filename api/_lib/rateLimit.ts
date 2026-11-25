// Limits per client and per day. This version keeps the counters in the memory of the running
// function, so it is "best effort": every cold start or second instance begins from zero, which
// means it only stops simple abuse. For a reliable limit the same interface can be backed by
// Upstash Redis or Vercel KV (the variables are already in .env.example): implement
// RateLimiter over INCR/EXPIRE and pass it to the handler. Nothing else changes.

export type Limits = { readonly perHour: number; readonly daily: number };
export type LimitDecision =
  { readonly ok: true } | { readonly ok: false; readonly retryAfterSeconds: number };

export interface RateLimiter {
  /** `key` is already a hash: a real address never reaches the limiter. */
  check(key: string, limits: Limits): Promise<LimitDecision>;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

type Options = {
  now: () => number;
  /** How many different clients are remembered; the oldest are forgotten first. */
  maxKeys?: number;
};

export function createMemoryRateLimiter({ now, maxKeys = 5_000 }: Options): RateLimiter {
  const hits = new Map<string, number[]>();
  let day = Math.floor(now() / DAY_MS);
  let dailyCount = 0;

  return {
    check(key, limits) {
      const moment = now();

      const today = Math.floor(moment / DAY_MS);
      if (today !== day) {
        day = today;
        dailyCount = 0;
      }

      const recent = (hits.get(key) ?? []).filter((time) => moment - time < HOUR_MS);
      if (recent.length >= limits.perHour) {
        const oldest = recent[0] ?? moment;
        return Promise.resolve({
          ok: false,
          retryAfterSeconds: Math.ceil((oldest + HOUR_MS - moment) / 1000),
        });
      }
      if (dailyCount >= limits.daily) {
        return Promise.resolve({
          ok: false,
          retryAfterSeconds: Math.ceil(((day + 1) * DAY_MS - moment) / 1000),
        });
      }

      recent.push(moment);
      hits.delete(key); // re-insert: the most recently used client goes to the end
      hits.set(key, recent);
      dailyCount += 1;
      while (hits.size > maxKeys) {
        const first = hits.keys().next();
        if (first.done) break;
        hits.delete(first.value);
      }
      return Promise.resolve({ ok: true });
    },
  };
}
