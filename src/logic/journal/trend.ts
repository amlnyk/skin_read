import type { Intensity, JournalEntry } from '@/types';
import { dayStartMs, utcDate, DAY_MS } from './dates';
import { isCalendarDay } from './calendar';
import { SYMPTOM_KEYS, type SymptomKey } from './symptoms';

// The line of one symptom over the last days, and the dates that may explain a change.
// A day with no entry is a GAP (`null`), never a zero: "no entry" does not mean "no symptom".
// A real answer "0, none" is a value.

/** How many days the chart shows. */
export const TREND_DAYS = 30;

export type TrendPoint = {
  date: string;
  value: Intensity | null;
};

export type TrendEventKind = 'new_product' | 'routine_change';

export type TrendEvent = {
  date: string;
  kind: TrendEventKind;
  /** The products an entry marked as new on that day (empty for a routine change). */
  productIds: string[];
  /** The text of the routine change, as the user wrote it (empty for a new product). */
  note: string;
};

/** The `days` days that end on `endDate`, oldest first. Nothing for a date that is not a day. */
export function windowDates(endDate: string, days: number = TREND_DAYS): string[] {
  if (!isCalendarDay(endDate) || days < 1) return [];
  const end = dayStartMs(endDate);
  return Array.from({ length: days }, (_, index) => utcDate(end - (days - 1 - index) * DAY_MS));
}

/**
 * One point per day of the window. When one day has several entries, the one added last that
 * has the symptom wins (the later answer corrects the earlier one).
 */
export function trendSeries(
  entries: readonly JournalEntry[],
  symptom: SymptomKey,
  endDate: string,
  days: number = TREND_DAYS,
): TrendPoint[] {
  const byDate = new Map<string, Intensity>();
  for (const entry of entries) {
    const value = entry.symptoms[symptom];
    if (value !== undefined) byDate.set(entry.date, value);
  }
  return windowDates(endDate, days).map((date) => ({ date, value: byDate.get(date) ?? null }));
}

export type TrendRun = { index: number; value: Intensity }[];

/**
 * The runs of days that follow each other and all have a value. A day with no entry ends a run,
 * so a line is never drawn through a gap, and a gap is never drawn as a zero.
 */
export function runsOf(series: readonly TrendPoint[]): TrendRun[] {
  const runs: TrendRun[] = [];
  let run: TrendRun = [];
  series.forEach((point, index) => {
    if (point.value === null) {
      if (run.length > 0) runs.push(run);
      run = [];
    } else {
      run.push({ index, value: point.value });
    }
  });
  if (run.length > 0) runs.push(run);
  return runs;
}

/** How many days of the window have a value. */
export function recordedDays(series: readonly TrendPoint[]): number {
  return series.filter((point) => point.value !== null).length;
}

/**
 * The days of the window on which an entry says a new product was started, or the routine was
 * changed. One event of each kind per day, the products of that day joined, oldest first.
 */
export function trendEvents(
  entries: readonly JournalEntry[],
  endDate: string,
  days: number = TREND_DAYS,
): TrendEvent[] {
  const inWindow = new Set(windowDates(endDate, days));
  const products = new Map<string, string[]>();
  const notes = new Map<string, string[]>();
  for (const entry of entries) {
    if (!inWindow.has(entry.date)) continue;
    if (entry.newProductIds.length > 0) {
      const list = products.get(entry.date) ?? [];
      for (const id of entry.newProductIds) if (!list.includes(id)) list.push(id);
      products.set(entry.date, list);
    }
    const note = entry.routineChangeNote?.trim() ?? '';
    if (note !== '') notes.set(entry.date, [...(notes.get(entry.date) ?? []), note]);
  }
  const events: TrendEvent[] = [
    ...[...products].map(([date, productIds]) => ({
      date,
      kind: 'new_product' as const,
      productIds,
      note: '',
    })),
    ...[...notes].map(([date, list]) => ({
      date,
      kind: 'routine_change' as const,
      productIds: [],
      note: list.join('; '),
    })),
  ];
  return events.sort((a, b) =>
    a.date === b.date ? a.kind.localeCompare(b.kind) : a.date < b.date ? -1 : 1,
  );
}

/**
 * The symptom noted on most days of the window: the chart opens with it. Ties go to the first in
 * the order of the form. null when no symptom was noted in the window.
 */
export function mostRecordedSymptom(
  entries: readonly JournalEntry[],
  endDate: string,
  days: number = TREND_DAYS,
): SymptomKey | null {
  let best: SymptomKey | null = null;
  let bestCount = 0;
  for (const key of SYMPTOM_KEYS) {
    const count = recordedDays(trendSeries(entries, key, endDate, days));
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}
