import type { JournalEntry } from '@/types';
import { dayStartMs, utcDate, DAY_MS } from './dates';

// The month calendar of the journal. Pure: days are YYYY-MM-DD strings, calendar arithmetic is
// done in UTC (so no time zone can move a day), and the clock never appears here.

export type YearMonth = { year: number; month: number };

export type CalendarCell = {
  date: string;
  /** false: a day of the previous or next month that only fills the week. */
  inMonth: boolean;
};

/** The month of a YYYY-MM-DD day (month is 1..12). */
export function monthOf(date: string): YearMonth {
  const [year, month] = date.split('-').map(Number);
  return { year: year ?? 1970, month: month ?? 1 };
}

/** The month `delta` months after (or before, when negative) the given one. */
export function shiftMonth(value: YearMonth, delta: number): YearMonth {
  const index = value.year * 12 + (value.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/**
 * The weeks of a month, Monday first. Every week has 7 cells; the first and the last week are
 * filled up with the days of the neighbouring months (`inMonth: false`).
 */
export function monthGrid({ year, month }: YearMonth): CalendarCell[][] {
  const first = Date.UTC(year, month - 1, 1);
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((offset + length) / 7);
  const start = first - offset * DAY_MS;
  const grid: CalendarCell[][] = [];
  for (let week = 0; week < weeks; week += 1) {
    const row: CalendarCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = utcDate(start + (week * 7 + day) * DAY_MS);
      row.push({ date, inMonth: monthOf(date).month === month });
    }
    grid.push(row);
  }
  return grid;
}

/** The entries of each day. Entries of one day keep the order they have in the input. */
export function entriesByDate(entries: readonly JournalEntry[]): Map<string, JournalEntry[]> {
  const byDate = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) list.push(entry);
    else byDate.set(entry.date, [entry]);
  }
  return byDate;
}

/** Is it a real calendar day (YYYY-MM-DD)? */
export function isCalendarDay(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(dayStartMs(date));
}
