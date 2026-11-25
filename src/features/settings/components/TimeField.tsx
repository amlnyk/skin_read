import { useId } from 'react';
import styles from '../settings.module.css';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

// A native time field with a visible label: the phone shows its own time picker.
export function TimeField({ label, value, onChange }: Props) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.control}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
