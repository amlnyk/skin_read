import { useId } from 'react';
import styles from '../pages/JournalPage.module.css';

type Props = {
  label: string;
  value: string;
  /** The latest day that can be chosen (an entry is never about the future). */
  max: string;
  onChange: (value: string) => void;
};

// A native date field with a visible label: the phone shows its own calendar.
export function DateField({ label, value, max, onChange }: Props) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.control}
        type="date"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
