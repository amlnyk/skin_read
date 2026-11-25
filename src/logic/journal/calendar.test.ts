import { describe, expect, it } from 'vitest';
import type { Intensity, JournalEntry } from '@/types';
import { entriesByDate, isCalendarDay, monthGrid, monthOf, shiftMonth } from './calendar';
import {
  mostRecordedSymptom,
  recordedDays,
  runsOf,
  TREND_DAYS,
  trendEvents,
  trendSeries,
  windowDates,
} from './trend';

function entry(id: string, date: string, partial: Partial<JournalEntry> = {}): JournalEntry {
  return { id, date, symptoms: {}, newProductIds: [], note: '', ...partial };
}

describe('the month calendar', () => {
  it('January 2026 starts on Thursday: Monday-first weeks with filler days', () => {
    const grid = monthGrid({ year: 2026, month: 1 });
    expect(grid).toHaveLength(5);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0]?.[0]).toEqual({ date: '2025-12-29', inMonth: false });
    expect(grid[0]?.[3]).toEqual({ date: '2026-01-01', inMonth: true });
    expect(grid[4]?.[6]).toEqual({ date: '2026-02-01', inMonth: false });
    expect(grid.flat().filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it('a month that starts on Monday and has 28 days is exactly four weeks (February 2027)', () => {
    const grid = monthGrid({ year: 2027, month: 2 });
    expect(grid).toHaveLength(4);
    expect(grid.flat().every((cell) => cell.inMonth)).toBe(true);
  });

  it('a month that needs six weeks (August 2026 starts on Saturday)', () => {
    expect(monthGrid({ year: 2026, month: 8 })).toHaveLength(6);
  });

  it('a leap February has 29 days', () => {
    expect(
      monthGrid({ year: 2028, month: 2 })
        .flat()
        .filter((cell) => cell.inMonth),
    ).toHaveLength(29);
  });

  it('every day appears once and the days follow each other', () => {
    for (const month of [1, 2, 3, 10, 12]) {
      const dates = monthGrid({ year: 2026, month })
        .flat()
        .map((cell) => cell.date);
      expect(new Set(dates).size).toBe(dates.length);
      expect([...dates].sort()).toEqual(dates);
    }
  });

  it('shifts the month over the turn of the year, both ways', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 3 }, 0)).toEqual({ year: 2026, month: 3 });
    expect(shiftMonth({ year: 2026, month: 1 }, -13)).toEqual({ year: 2024, month: 12 });
  });

  it('takes the month of a day', () => {
    expect(monthOf('2026-01-05')).toEqual({ year: 2026, month: 1 });
  });

  it('groups the entries by day, keeping their order', () => {
    const map = entriesByDate([
      entry('a', '2026-01-02'),
      entry('b', '2026-01-03'),
      entry('c', '2026-01-02'),
    ]);
    expect(map.get('2026-01-02')?.map((item) => item.id)).toEqual(['a', 'c']);
    expect(map.get('2026-01-03')?.map((item) => item.id)).toEqual(['b']);
    expect(map.has('2026-01-04')).toBe(false);
  });

  it('knows a real day from a wrong one', () => {
    expect(isCalendarDay('2026-01-05')).toBe(true);
    expect(isCalendarDay('2026-13-45')).toBe(false);
    expect(isCalendarDay('hello')).toBe(false);
    expect(isCalendarDay('')).toBe(false);
  });
});

describe('the 30-day series of a symptom', () => {
  const END = '2026-01-30';

  it('has one point per day, oldest first, ending on the last day', () => {
    const series = trendSeries([], 'dryness', END);
    expect(series).toHaveLength(TREND_DAYS);
    expect(series[0]?.date).toBe('2026-01-01');
    expect(series[29]?.date).toBe(END);
  });

  it('a day without an entry is a gap (null), never a zero', () => {
    const series = trendSeries(
      [
        entry('a', '2026-01-10', { symptoms: { dryness: 2 } }),
        entry('b', '2026-01-12', { symptoms: { dryness: 0 } }),
      ],
      'dryness',
      END,
    );
    const at = (date: string) => series.find((point) => point.date === date)?.value;
    expect(at('2026-01-10')).toBe(2);
    expect(at('2026-01-11')).toBeNull();
    expect(at('2026-01-12')).toBe(0); // a real answer "none" is a value
    expect(recordedDays(series)).toBe(2);
  });

  it('an entry that does not mention the symptom leaves a gap for it', () => {
    const series = trendSeries(
      [entry('a', '2026-01-10', { symptoms: { redness: 3 } })],
      'dryness',
      END,
    );
    expect(recordedDays(series)).toBe(0);
  });

  it('entries outside the window are not drawn', () => {
    const series = trendSeries(
      [
        entry('old', '2025-12-31', { symptoms: { dryness: 3 } }),
        entry('future', '2026-01-31', { symptoms: { dryness: 3 } }),
      ],
      'dryness',
      END,
    );
    expect(recordedDays(series)).toBe(0);
  });

  it('two entries on one day: the one added later wins', () => {
    const series = trendSeries(
      [
        entry('a', '2026-01-10', { symptoms: { dryness: 1 } }),
        entry('b', '2026-01-10', { symptoms: { dryness: 3 } }),
      ],
      'dryness',
      END,
    );
    expect(series.find((point) => point.date === '2026-01-10')?.value).toBe(3);
  });

  it('crosses the turn of the year', () => {
    const dates = windowDates('2026-01-03', 5);
    expect(dates).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('a wrong end date gives no window instead of an error', () => {
    expect(windowDates('nonsense')).toEqual([]);
    expect(trendSeries([], 'dryness', 'nonsense')).toEqual([]);
  });

  it('does not change its input', () => {
    const list = [entry('a', '2026-01-10', { symptoms: { dryness: 2 as Intensity } })];
    const before = JSON.stringify(list);
    trendSeries(list, 'dryness', END);
    trendEvents(list, END);
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe('the markers of the chart', () => {
  const END = '2026-01-30';

  it('a day with new products gets one marker with the products joined', () => {
    const events = trendEvents(
      [
        entry('a', '2026-01-10', { newProductIds: ['p1', 'p2'] }),
        entry('b', '2026-01-10', { newProductIds: ['p2', 'p3'] }),
      ],
      END,
    );
    expect(events).toEqual([
      { date: '2026-01-10', kind: 'new_product', productIds: ['p1', 'p2', 'p3'], note: '' },
    ]);
  });

  it('a routine change is a marker with its text; a blank text is not', () => {
    const events = trendEvents(
      [
        entry('a', '2026-01-12', { routineChangeNote: ' stopped the toner ' }),
        entry('b', '2026-01-13', { routineChangeNote: '   ' }),
      ],
      END,
    );
    expect(events).toEqual([
      { date: '2026-01-12', kind: 'routine_change', productIds: [], note: 'stopped the toner' },
    ]);
  });

  it('is sorted by day, and outside the window nothing shows', () => {
    const events = trendEvents(
      [
        entry('late', '2026-01-20', { newProductIds: ['p1'] }),
        entry('early', '2026-01-05', { routineChangeNote: 'x' }),
        entry('old', '2025-11-05', { newProductIds: ['p9'] }),
      ],
      END,
    );
    expect(events.map((event) => event.date)).toEqual(['2026-01-05', '2026-01-20']);
  });

  it('with no entries there are no markers', () => {
    expect(trendEvents([], END)).toEqual([]);
  });
});

describe('the symptom the chart opens with', () => {
  const END = '2026-01-30';

  it('is the one noted on most days; a tie goes to the first in the form', () => {
    const list = [
      entry('a', '2026-01-10', { symptoms: { redness: 1, dryness: 1 } }),
      entry('b', '2026-01-11', { symptoms: { redness: 2 } }),
    ];
    expect(mostRecordedSymptom(list, END)).toBe('redness');
    expect(
      mostRecordedSymptom(
        [entry('c', '2026-01-10', { symptoms: { redness: 1, dryness: 1 } })],
        END,
      ),
    ).toBe('dryness');
  });

  it('is null when nothing was noted in the window', () => {
    expect(mostRecordedSymptom([], END)).toBeNull();
    expect(
      mostRecordedSymptom([entry('old', '2025-01-01', { symptoms: { dryness: 3 } })], END),
    ).toBeNull();
  });
});

describe('the runs of the line', () => {
  it('a gap ends a run, and a zero is a value that stays in a run', () => {
    const series = [2, 0, null, 3, null, null, 1].map((value, index) => ({
      date: `2026-01-0${index + 1}`,
      value: value as Intensity | null,
    }));
    expect(runsOf(series)).toEqual([
      [
        { index: 0, value: 2 },
        { index: 1, value: 0 },
      ],
      [{ index: 3, value: 3 }],
      [{ index: 6, value: 1 }],
    ]);
  });

  it('a series with no values has no runs', () => {
    expect(runsOf(trendSeries([], 'dryness', '2026-01-30'))).toEqual([]);
  });
});
