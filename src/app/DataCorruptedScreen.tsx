import { useState } from 'react';
import { t } from '@/i18n';
import styles from './PersistenceGate.module.css';

type Props = {
  onDownload: () => void;
  onReset: () => void;
};

// Shown instead of the app when saved data could not be read. Nothing is erased silently:
// the user can download the raw data first, and reset needs a second, explicit confirmation.
export function DataCorruptedScreen({ onDownload, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{t('persistence.corruptedTitle')}</h1>
      <p>{t('persistence.corruptedText')}</p>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onDownload}>
          {t('persistence.downloadRaw')}
        </button>
        {!confirming && (
          <button type="button" className={styles.button} onClick={() => setConfirming(true)}>
            {t('persistence.reset')}
          </button>
        )}
      </div>
      {confirming && (
        <div className={styles.screen}>
          <p>{t('persistence.resetConfirmText')}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={onReset}>
              {t('persistence.resetConfirm')}
            </button>
            <button type="button" className={styles.button} onClick={() => setConfirming(false)}>
              {t('persistence.resetCancel')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
