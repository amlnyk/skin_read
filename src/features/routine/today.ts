const two = (value: number) => String(value).padStart(2, '0');

/**
 * The calendar day of the user (their own time zone) as YYYY-MM-DD.
 * A "done today" mark belongs to this day only: tomorrow the date differs and the mark is gone.
 */
export function localDate(nowMs: number): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}
