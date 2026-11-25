import { t } from '@/i18n';
import styles from './MedicalDisclaimer.module.css';

type Props = { text: string };

// Presentational only: the text comes from src/content/data/disclaimer.json via the caller.
export function MedicalDisclaimer({ text }: Props) {
  return (
    <aside className={styles.box} role="note" aria-label={t('disclaimer.label')}>
      <p>{text}</p>
    </aside>
  );
}
