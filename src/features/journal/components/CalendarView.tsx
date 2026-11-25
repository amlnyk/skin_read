import { useState } from 'react';
import { t, type MessageKey } from '@/i18n';
import { entriesByDate, monthGrid, monthOf, shiftMonth, type YearMonth } from '@/logic/journal';
import type { JournalEntry, Product } from '@/types';
import { Button } from '@/ui';
import { describeEntry } from '../utils/describeEntry';
import { formatDate } from '../utils/today';
import styles from './dynamics.module.css';

const WEEKDAYS: readonly MessageKey[] = [
  'journal.weekday.mon',
  'journal.weekday.tue',
  'journal.weekday.wed',
  'journal.weekday.thu',
  'journal.weekday.fri',
  'journal.weekday.sat',
  'journal.weekday.sun',
];

const MONTHS: readonly MessageKey[] = [
  'journal.month.jan',
  'journal.month.feb',
  'journal.month.mar',
  'journal.month.apr',
  'journal.month.may',
  'journal.month.jun',
  'journal.month.jul',
  'journal.month.aug',
  'journal.month.sep',
  'journal.month.oct',
  'journal.month.nov',
  'journal.month.dec',
];

type Props = {
  entries: readonly JournalEntry[];
  products: readonly Product[];
  /** The user's today (YYYY-MM-DD): the calendar opens on its month and marks it. */
  today: string;
};

// The month calendar: a mark on every day that has an entry. Touching a marked day opens the
// entry under the calendar. Days with no entry are plain numbers, nothing is implied by them.
export function CalendarView({ entries, products, today }: Props) {
  const [month, setMonth] = useState<YearMonth>(() => monthOf(today));
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = entriesByDate(entries);
  const grid = monthGrid(month);
  const monthKey = MONTHS[month.month - 1];
  const title = t('journal.calendarMonth', {
    month: monthKey ? t(monthKey) : '',
    year: month.year,
  });
  const opened = selected === null ? undefined : byDate.get(selected);

  return (
    <section aria-labelledby="journal-calendar-title" className={styles.block}>
      <h2 id="journal-calendar-title">{t('journal.calendarTitle')}</h2>
      <p className={styles.hint}>{t('journal.calendarHint')}</p>

      <div className={styles.monthBar}>
        <Button variant="secondary" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
          {t('journal.calendarPrev')}
        </Button>
        <Button variant="secondary" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
          {t('journal.calendarNext')}
        </Button>
      </div>

      <table className={styles.calendar}>
        <caption className={styles.monthTitle}>{title}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((key) => (
              <th key={key} scope="col">
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week) => (
            <tr key={week[0]?.date ?? title}>
              {week.map((cell) => {
                if (!cell.inMonth) return <td key={cell.date} aria-hidden="true" />;
                const day = Number(cell.date.slice(8));
                const current = cell.date === today ? 'date' : undefined;
                const has = byDate.has(cell.date);
                return (
                  <td key={cell.date}>
                    {has ? (
                      <button
                        type="button"
                        className={styles.dayButton}
                        aria-label={t('journal.dayOpen', { date: formatDate(cell.date) })}
                        aria-pressed={selected === cell.date}
                        aria-current={current}
                        onClick={() => setSelected(selected === cell.date ? null : cell.date)}
                      >
                        <span>{day}</span>
                        <span className={styles.mark} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className={styles.day} aria-current={current}>
                        {day}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selected !== null && opened ? (
        <section aria-labelledby="journal-day-title" className={styles.dayPanel}>
          <h3 id="journal-day-title">{t('journal.dayTitle', { date: formatDate(selected) })}</h3>
          {opened.map((entry) => (
            <div key={entry.id}>
              <ul className={styles.lines}>
                {describeEntry(entry, products).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {entry.note === '' ? null : <p>{entry.note}</p>}
            </div>
          ))}
          <Button variant="secondary" onClick={() => setSelected(null)}>
            {t('journal.dayClose')}
          </Button>
        </section>
      ) : null}
    </section>
  );
}
