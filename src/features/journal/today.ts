const two = (value: number) => String(value).padStart(2, '0');

/** The calendar day of the user (their own time zone) as YYYY-MM-DD: the default date of an entry. */
export function localDate(nowMs: number): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/** 2026-01-15 -> 15.01.2026 (taken apart as text, so no time zone can move the day). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day ?? ''}.${month ?? ''}.${year ?? ''}`;
}
