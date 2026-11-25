import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { dateAfter } from '@/logic/journal';
import { APP_NOW, productOf, renderApp } from '@/test/appHarness';
import { PERSONAS } from '@/test/personas';
import type { JournalEntry } from '@/types';
import { formatDate, localDate, shortDate } from './today';

afterEach(cleanup);

const TODAY = localDate(APP_NOW);
const ago = (days: number) => dateAfter(APP_NOW, -days);

function entry(id: string, date: string, partial: Partial<JournalEntry> = {}): JournalEntry {
  return { id, date, symptoms: {}, newProductIds: [], note: '', ...partial };
}

/** Ten entries on ten different days of the last three weeks, with dryness on all of them. */
const TEN: JournalEntry[] = [1, 2, 4, 5, 7, 9, 12, 14, 17, 20].map((days, index) =>
  entry(`e${index}`, ago(days), {
    symptoms: { dryness: (index % 4) as 0 | 1 | 2 | 3 },
    note: `note ${index}`,
  }),
);

const open = (journal: JournalEntry[], extra: Parameters<typeof renderApp>[1] = {}) =>
  renderApp('/profile/journal', { persona: PERSONAS.T4, journal, now: APP_NOW, ...extra });

describe('the calendar', () => {
  it('is not shown while the journal is empty', async () => {
    open([]);
    await screen.findByRole('heading', { name: t('journal.title') });
    expect(
      screen.queryByRole('heading', { name: t('journal.calendarTitle') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('journal.trendTitle') }),
    ).not.toBeInTheDocument();
  });

  it('after 10 entries: a mark (a button) on every day with an entry of the shown month, and nowhere else', async () => {
    open(TEN);
    const calendar = (
      await screen.findByRole('heading', { name: t('journal.calendarTitle') })
    ).closest('section');
    expect(calendar).not.toBeNull();
    const here = within(calendar as HTMLElement);
    const month = TODAY.slice(0, 7);
    const expected = TEN.filter((item) => item.date.startsWith(month));
    expect(expected.length).toBeGreaterThan(0);
    const buttons = here.queryAllByRole('button', { name: /Відкрити запис за/ });
    expect(buttons).toHaveLength(expected.length);
    for (const item of expected) {
      expect(
        here.getByRole('button', { name: t('journal.dayOpen', { date: formatDate(item.date) }) }),
      ).toBeInTheDocument();
    }
  });

  it('touching a marked day opens the entry, and a second touch closes it', async () => {
    open([entry('one', ago(1), { symptoms: { redness: 2 }, note: 'seen on the calendar' })]);
    const day = await screen.findByRole('button', {
      name: t('journal.dayOpen', { date: formatDate(ago(1)) }),
    });
    expect(
      screen.queryByRole('heading', { name: t('journal.dayTitle', { date: formatDate(ago(1)) }) }),
    ).not.toBeInTheDocument();
    fireEvent.click(day);
    const panel = screen
      .getByRole('heading', { name: t('journal.dayTitle', { date: formatDate(ago(1)) }) })
      .closest('section');
    expect(within(panel as HTMLElement).getByText('seen on the calendar')).toBeInTheDocument();
    expect(
      within(panel as HTMLElement).getByText(
        `${t('journal.symptom.redness')}: ${t('journal.intensity.2')}`,
      ),
    ).toBeInTheDocument();
    expect(day).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(day);
    expect(
      screen.queryByRole('heading', { name: t('journal.dayTitle', { date: formatDate(ago(1)) }) }),
    ).not.toBeInTheDocument();
  });

  it('the previous month shows its own marked days; the next month of today is just as reachable', async () => {
    const lastMonth = dateAfter(APP_NOW, -35);
    open([entry('far', lastMonth, { symptoms: { dryness: 1 } })]);
    await screen.findByRole('heading', { name: t('journal.calendarTitle') });
    const name = t('journal.dayOpen', { date: formatDate(lastMonth) });
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('journal.calendarPrev') }));
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('journal.calendarNext') }));
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('names the month and the weekdays', async () => {
    open([entry('one', ago(1), { symptoms: { dryness: 1 } })]);
    await screen.findByRole('heading', { name: t('journal.calendarTitle') });
    expect(screen.getByText('Пн')).toBeInTheDocument();
    expect(screen.getByText('Нд')).toBeInTheDocument();
    expect(screen.getByText(/Січень 2026/)).toBeInTheDocument();
  });
});

describe('the 30-day chart', () => {
  it('opens with the symptom that has the most entries and has the caption about causes', async () => {
    open(TEN);
    expect(
      await screen.findByRole('heading', { name: t('journal.trendTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(t('journal.trendSymptom'))).toHaveValue('dryness');
    expect(
      screen.getByRole('img', {
        name: t('journal.trendAlt', { symptom: t('journal.symptom.dryness'), count: 10 }),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('journal.trendCaption'))).toBeInTheDocument();
    expect(t('journal.trendCaption')).toBe('Збіг у часі не означає причини.');
  });

  it('the line has gaps: one point per entry day, one line piece per run of days, and no zeros invented', async () => {
    open([
      entry('a', ago(10), { symptoms: { dryness: 2 } }),
      entry('b', ago(9), { symptoms: { dryness: 0 } }),
      entry('c', ago(5), { symptoms: { dryness: 3 } }),
    ]);
    const chart = await screen.findByRole('img', {
      name: t('journal.trendAlt', { symptom: t('journal.symptom.dryness'), count: 3 }),
    });
    // 3 values drawn as points (the entry with the answer "none" is a point too)
    expect(chart.querySelectorAll('[data-trend="point"]')).toHaveLength(3);
    // only the two days in a row are joined; the third is alone behind a gap
    const lines = chart.querySelectorAll('[data-trend="line"]');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.getAttribute('d')?.match(/L/g)).toHaveLength(1);
  });

  it('a symptom nobody noted: says so and draws no points', async () => {
    open(TEN);
    const select = await screen.findByLabelText(t('journal.trendSymptom'));
    fireEvent.change(select, { target: { value: 'burning' } });
    expect(screen.getByText(t('journal.trendEmpty'))).toBeInTheDocument();
    const chart = screen.getByRole('img', {
      name: t('journal.trendAlt', { symptom: t('journal.symptom.burning'), count: 0 }),
    });
    expect(chart.querySelectorAll('[data-trend="point"]')).toHaveLength(0);
  });

  it('entries older than 30 days are not drawn', async () => {
    open([
      entry('old', ago(45), { symptoms: { dryness: 3 } }),
      entry('new', ago(2), { symptoms: { dryness: 1 } }),
    ]);
    const chart = await screen.findByRole('img', {
      name: t('journal.trendAlt', { symptom: t('journal.symptom.dryness'), count: 1 }),
    });
    expect(chart.querySelectorAll('[data-trend="point"]')).toHaveLength(1);
  });

  it('marks the days of a new product and of a routine change, and lists them in words', async () => {
    open(
      [
        entry('a', ago(10), { symptoms: { dryness: 2 }, newProductIds: ['p1'] }),
        entry('b', ago(6), { symptoms: { dryness: 1 }, routineChangeNote: 'dropped the toner' }),
      ],
      { products: [productOf('p1', 'My serum', 'Aqua, Glycerin, Panthenol, Allantoin, Squalane')] },
    );
    const chart = await screen.findByRole('img', {
      name: t('journal.trendAlt', { symptom: t('journal.symptom.dryness'), count: 2 }),
    });
    expect(chart.querySelectorAll('[data-trend="event"]')).toHaveLength(2);
    expect(
      screen.getByText(t('journal.eventProduct', { date: formatDate(ago(10)), names: 'My serum' })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        t('journal.eventRoutine', { date: formatDate(ago(6)), text: 'dropped the toner' }),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(t('journal.legendProduct'))).toBeInTheDocument();
    expect(screen.getByText(t('journal.legendRoutine'))).toBeInTheDocument();
  });

  it('a removed product still leaves its marker, without a name', async () => {
    open([entry('a', ago(3), { symptoms: { dryness: 2 }, newProductIds: ['gone'] })]);
    await screen.findByRole('heading', { name: t('journal.trendTitle') });
    expect(
      screen.getByText(t('journal.eventProductGone', { date: formatDate(ago(3)) })),
    ).toBeInTheDocument();
  });

  it('the values are also available as text, and the axis shows the first and the last day', async () => {
    open([entry('a', ago(2), { symptoms: { dryness: 3 } })]);
    await screen.findByRole('heading', { name: t('journal.trendTitle') });
    expect(
      screen.getByText(
        t('journal.trendListItem', { date: formatDate(ago(2)), value: t('journal.intensity.3') }),
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(shortDate(TODAY)).length).toBeGreaterThan(0);
    expect(screen.getByText(shortDate(ago(29)))).toBeInTheDocument();
  });

  it('says that a day with no entry is not "no symptom"', async () => {
    open(TEN);
    expect(await screen.findByText(t('journal.trendGaps'))).toBeInTheDocument();
  });
});

describe('a change in the routine in the form', () => {
  it('is saved with the entry and shown in the list', async () => {
    const { store } = open([]);
    fireEvent.click(await screen.findByRole('button', { name: t('journal.add') }));
    fireEvent.change(screen.getByLabelText(t('journal.routineChange')), {
      target: { value: ' new cleanser ' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));
    expect(
      await screen.findByText(t('journal.entryRoutineChange', { text: 'new cleanser' })),
    ).toBeInTheDocument();
    expect(store.getState().journal[0]?.routineChangeNote).toBe('new cleanser');
  });
});
