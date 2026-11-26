import { t } from '@/i18n';
import type { Slot } from '@/types';
import type { TodayStep } from '../hooks/useHomeSummary';
import styles from '../styles/checklist.module.css';

type Props = {
  slot: Slot;
  steps: TodayStep[];
  done: string[];
  onToggle: (stepId: string) => void;
};

// One slot of the day as a list of real checkboxes. A done step gets a line drawn through it
// (an animation in CSS; with reduced motion the line simply appears).
export function TodayChecklist({ slot, steps, done, onToggle }: Props) {
  if (steps.length === 0) return null;
  const headingId = `today-${slot}`;
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          {slot === 'am' ? t('home.careTitleAm') : t('home.careTitlePm')}
        </h2>
        <span className={styles.count}>
          {t('home.careDone', { done: done.length, total: steps.length })}
        </span>
      </div>
      <ul className={styles.list}>
        {steps.map((step) => {
          const checked = done.includes(step.id);
          const name = t(`category.${step.category}`);
          return (
            <li key={step.id}>
              <label className={styles.row}>
                <input
                  type="checkbox"
                  className={styles.box}
                  checked={checked}
                  onChange={() => onToggle(step.id)}
                />
                <span className={styles.text}>
                  <span className={checked ? `${styles.name} ${styles.struck}` : styles.name}>
                    {name}
                  </span>
                  {step.productName ? (
                    <span className={styles.product}>{step.productName}</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
