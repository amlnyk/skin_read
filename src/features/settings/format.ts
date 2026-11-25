/** 2026-01-15 or 2026-01-15T10:00:00.000Z -> 15.01.2026 (taken apart as text: no time zone moves the day). */
export function formatDate(isoDateOrDateTime: string): string {
  const [year, month, day] = isoDateOrDateTime.slice(0, 10).split('-');
  return `${day ?? ''}.${month ?? ''}.${year ?? ''}`;
}
