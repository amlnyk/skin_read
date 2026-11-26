import { useId } from 'react';
import styles from './TextInput.module.css';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  hint?: string;
  /** Shown under the field instead of the hint; marks the field as invalid. */
  error?: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
};

// A one-line text field with a visible label (at least 44 px high, like the buttons).
export function TextInput({
  label,
  value,
  onChange,
  maxLength,
  hint,
  error,
  type = 'text',
  autoComplete,
}: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const note = error ?? hint;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={error ? `${styles.input} ${styles.invalid}` : styles.input}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {note ? (
        <span id={hintId} className={error ? styles.error : styles.hint}>
          {note}
        </span>
      ) : null}
    </div>
  );
}
