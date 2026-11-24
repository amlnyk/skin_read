import { useId, type FocusEvent } from 'react';
import styles from './Field.module.css';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
};

// A multi-line text field. When it gets focus it scrolls to the middle of the screen,
// so the phone keyboard does not cover it.
export function Field({ label, value, onChange, maxLength }: Props) {
  const id = useId();

  const onFocus = (event: FocusEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={styles.input}
        value={value}
        maxLength={maxLength}
        rows={3}
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={styles.counter} aria-hidden="true">
        {`${value.length}/${maxLength}`}
      </span>
    </div>
  );
}
