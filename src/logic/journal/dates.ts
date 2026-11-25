// Calendar arithmetic on YYYY-MM-DD strings, in UTC, with no clock of its own: the moment
// ("now", in milliseconds) always comes in as an argument.

export const DAY_MS = 86_400_000;

/** Midnight (UTC) at the start of the given day. */
export function dayStartMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** The UTC calendar day of a moment as YYYY-MM-DD. */
export function utcDate(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** The day that is `days` after the day of `nowMs`. */
export function dateAfter(nowMs: number, days: number): string {
  return utcDate(nowMs + days * DAY_MS);
}

/**
 * Whole days from the entry's day to `nowMs`: 0 today, 1 yesterday, -1 for a day that has
 * already started somewhere east of UTC (the user's own day can be one day ahead of UTC).
 */
export function daysAgo(date: string, nowMs: number): number {
  return Math.floor((nowMs - dayStartMs(date)) / DAY_MS);
}
