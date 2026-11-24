import styles from './ProgressBar.module.css';

type Props = {
  value: number;
  max: number;
  /** Accessible name, for example "Progress of the test". */
  label: string;
  /** What a screen reader says, for example "Question 3 of 12". */
  valueText: string;
};

// Native <progress>: accessible without ARIA tricks and without inline styles.
export function ProgressBar({ value, max, label, valueText }: Props) {
  return (
    <progress
      className={styles.progress}
      value={value}
      max={max}
      aria-label={label}
      aria-valuetext={valueText}
    />
  );
}
