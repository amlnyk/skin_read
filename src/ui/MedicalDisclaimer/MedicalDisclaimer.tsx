import styles from './MedicalDisclaimer.module.css';

type Props = { text: string };

// Presentational only: the text comes from src/content/disclaimer.json via the caller.
export function MedicalDisclaimer({ text }: Props) {
  return (
    <aside className={styles.box} role="note" aria-label="Медичне застереження">
      <p>{text}</p>
    </aside>
  );
}
