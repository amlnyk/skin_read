import { t } from '@/i18n';
import type { PersistedState } from '@/types';
import { summarizeData } from '../utils/dataCategories';
import styles from '../styles/settings.module.css';

// "What is stored", in plain words, with how much of each. Only numbers, never the data itself.
export function StoredList({
  data,
  photoCount,
}: {
  data: PersistedState;
  photoCount: number | null;
}) {
  const summary = summarizeData(data);
  return (
    <section className={styles.card} aria-labelledby="stored-title">
      <h2 id="stored-title">{t('settings.storedTitle')}</h2>
      <p>{t('settings.storedIntro')}</p>
      <ul className={styles.lines}>
        <li>
          {t('settings.storedProfile', {
            state: summary.hasProfile
              ? t('settings.storedProfileYes')
              : t('settings.storedProfileNo'),
          })}
        </li>
        <li>{t('settings.storedRoutine', { count: summary.routineSteps })}</li>
        <li>{t('settings.storedProducts', { count: summary.products })}</li>
        <li>{t('settings.storedScans', { count: summary.scans })}</li>
        <li>{t('settings.storedJournal', { count: summary.journal })}</li>
        {photoCount !== null ? <li>{t('settings.storedPhotos', { count: photoCount })}</li> : null}
        <li>{t('settings.storedSettings')}</li>
      </ul>
      <p role="note" className={styles.notice}>
        {t('settings.browserWarning')}
      </p>
    </section>
  );
}
