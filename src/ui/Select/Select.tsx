import { useId } from 'react';
import styles from './Select.module.css';

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
};

// A native select with a visible label: the phone shows its own picker.
export function Select({ label, value, options, onChange }: Props) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
