import { useState } from 'react';
import { t } from '@/i18n';
import {
  mostRecordedSymptom,
  recordedDays,
  runsOf,
  SYMPTOM_KEYS,
  trendEvents,
  trendSeries,
  type SymptomKey,
  type TrendEvent,
} from '@/logic/journal';
import type { JournalEntry, Product } from '@/types';
import { Select } from '@/ui';
import { formatDate, shortDate } from '../today';
import styles from './dynamics.module.css';

// The chart is drawn by hand in SVG (no library). Geometry in the units of the viewBox.
const WIDTH = 320;
const HEIGHT = 176;
const LEFT = 28;
const RIGHT = 12;
const TOP = 26;
const BOTTOM = 22;
const PLOT_W = WIDTH - LEFT - RIGHT;
const PLOT_H = HEIGHT - TOP - BOTTOM;
const LEVELS = [0, 1, 2, 3] as const;

type Props = {
  entries: readonly JournalEntry[];
  products: readonly Product[];
  /** The user's today (YYYY-MM-DD): the last day of the chart. */
  endDate: string;
};

function xAt(index: number, count: number): number {
  return LEFT + (count <= 1 ? 0 : (index * PLOT_W) / (count - 1));
}

const yAt = (value: number): number => TOP + PLOT_H - (value / 3) * PLOT_H;

function eventNames(event: TrendEvent, products: readonly Product[]): string[] {
  return event.productIds
    .map((id) => products.find((product) => product.id === id)?.name)
    .filter((name): name is string => name !== undefined);
}

function eventText(event: TrendEvent, products: readonly Product[]): string {
  const date = formatDate(event.date);
  if (event.kind === 'routine_change') return t('journal.eventRoutine', { date, text: event.note });
  const names = eventNames(event, products);
  return names.length === 0
    ? t('journal.eventProductGone', { date })
    : t('journal.eventProduct', { date, names: names.join(', ') });
}

// The line of one symptom for the last 30 days. Days with no entry are gaps. The markers show the
// days a new product was started or the routine was changed; the caption says that a coincidence
// in time is not a cause.
export function TrendChart({ entries, products, endDate }: Props) {
  const [chosen, setChosen] = useState<SymptomKey | null>(null);
  const symptom = chosen ?? mostRecordedSymptom(entries, endDate) ?? SYMPTOM_KEYS[0];

  const series = trendSeries(entries, symptom, endDate);
  const events = trendEvents(entries, endDate);
  const count = recordedDays(series);
  const symptomName = t(`journal.symptom.${symptom}`);
  const dayIndex = new Map(series.map((point, index) => [point.date, index]));
  const last = series.length - 1;

  return (
    <section aria-labelledby="journal-trend-title" className={styles.block}>
      <h2 id="journal-trend-title">{t('journal.trendTitle')}</h2>
      <Select
        label={t('journal.trendSymptom')}
        value={symptom}
        options={SYMPTOM_KEYS.map((key) => ({ value: key, label: t(`journal.symptom.${key}`) }))}
        onChange={(value) => setChosen(SYMPTOM_KEYS.find((key) => key === value) ?? null)}
      />

      {count === 0 ? <p>{t('journal.trendEmpty')}</p> : null}

      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('journal.trendAlt', { symptom: symptomName, count })}
        focusable="false"
      >
        {LEVELS.map((level) => (
          <g key={level}>
            <line
              className={styles.grid}
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={yAt(level)}
              y2={yAt(level)}
            />
            <text className={styles.axis} x={LEFT - 8} y={yAt(level) + 4} textAnchor="end">
              {String(level)}
            </text>
          </g>
        ))}

        {events.map((event) => {
          const index = dayIndex.get(event.date);
          if (index === undefined) return null;
          const both = events.some(
            (other) => other.date === event.date && other.kind !== event.kind,
          );
          const x =
            xAt(index, series.length) + (both ? (event.kind === 'new_product' ? -6 : 6) : 0);
          const top = TOP - 18;
          return (
            <g key={`${event.date}-${event.kind}`} className={styles.event} data-trend="event">
              <line x1={x} x2={x} y1={top + 8} y2={TOP + PLOT_H} />
              {event.kind === 'new_product' ? (
                <path d={`M${x} ${top} L${x + 6} ${top + 11} L${x - 6} ${top + 11} Z`} />
              ) : (
                <path
                  d={`M${x} ${top} L${x + 6} ${top + 6} L${x} ${top + 12} L${x - 6} ${top + 6} Z`}
                />
              )}
            </g>
          );
        })}

        {runsOf(series).map((run) =>
          run.length > 1 ? (
            <path
              key={`run-${run[0]?.index ?? 0}`}
              className={styles.line}
              data-trend="line"
              d={run
                .map(
                  (point, order) =>
                    `${order === 0 ? 'M' : 'L'}${xAt(point.index, series.length)} ${yAt(point.value)}`,
                )
                .join(' ')}
            />
          ) : null,
        )}
        {series.map((point, index) =>
          point.value === null ? null : (
            <circle
              key={point.date}
              className={styles.point}
              data-trend="point"
              cx={xAt(index, series.length)}
              cy={yAt(point.value)}
              r={3.5}
            />
          ),
        )}

        <text className={styles.axis} x={LEFT} y={HEIGHT - 4} textAnchor="start">
          {shortDate(series[0]?.date ?? endDate)}
        </text>
        <text className={styles.axis} x={xAt(last, series.length)} y={HEIGHT - 4} textAnchor="end">
          {shortDate(series[last]?.date ?? endDate)}
        </text>
      </svg>

      <ul className={styles.legend}>
        <li>
          <svg
            viewBox="0 0 14 14"
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
            className={styles.legendIcon}
          >
            <path d="M7 1 13 12H1Z" />
          </svg>
          {t('journal.legendProduct')}
        </li>
        <li>
          <svg
            viewBox="0 0 14 14"
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
            className={styles.legendIcon}
          >
            <path d="M7 1 13 7 7 13 1 7Z" />
          </svg>
          {t('journal.legendRoutine')}
        </li>
      </ul>

      <p className={styles.hint}>{t('journal.trendScale')}</p>
      <p className={styles.hint}>{t('journal.trendGaps')}</p>
      <p className={styles.caption}>{t('journal.trendCaption')}</p>

      <details>
        <summary>{t('journal.trendListTitle')}</summary>
        <ul className={styles.lines}>
          {series
            .filter((point) => point.value !== null)
            .map((point) => (
              <li key={point.date}>
                {t('journal.trendListItem', {
                  date: formatDate(point.date),
                  value: point.value === null ? '' : t(`journal.intensity.${point.value}`),
                })}
              </li>
            ))}
          {events.map((event) => (
            <li key={`${event.date}-${event.kind}`}>{eventText(event, products)}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
