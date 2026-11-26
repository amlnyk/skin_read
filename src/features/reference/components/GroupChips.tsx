import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import styles from './GroupChips.module.css';

const STEP = 3;

export type GroupChip = { id: string; label: string };

type Props = {
  chips: readonly GroupChip[];
  selected: string;
  onSelect: (id: string) => void;
};

// One line of buttons that scrolls sideways. The arrows move the line by three buttons.
export function GroupChips({ chips, selected, onSelect }: Props) {
  const line = useRef<HTMLDivElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const measure = useCallback(() => {
    const el = line.current;
    if (!el) return;
    setCanBack(el.scrollLeft > 1);
    setCanForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, chips.length]);

  const move = (direction: 1 | -1) => {
    const el = line.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    const first = Math.max(
      0,
      items.findIndex((item) => item.offsetLeft + item.offsetWidth > el.scrollLeft + 1),
    );
    const target = items[Math.min(Math.max(first + direction * STEP, 0), items.length - 1)];
    el.scrollTo?.({ left: target ? target.offsetLeft : 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.arrow}
        aria-label={t('reference.groupFilterBack')}
        disabled={!canBack}
        onClick={() => move(-1)}
      >
        <span aria-hidden="true">{'‹'}</span>
      </button>
      <div
        ref={line}
        role="group"
        aria-label={t('reference.groupFilterLabel')}
        className={styles.line}
        onScroll={measure}
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={selected === chip.id}
            className={selected === chip.id ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            onClick={() => onSelect(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.arrow}
        aria-label={t('reference.groupFilterForward')}
        disabled={!canForward}
        onClick={() => move(1)}
      >
        <span aria-hidden="true">{'›'}</span>
      </button>
    </div>
  );
}
