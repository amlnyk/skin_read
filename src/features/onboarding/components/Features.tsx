import { t } from '@/i18n';
import styles from '../styles/onboarding.module.css';

export function Features() {
  return (
    <section className={styles.step}>
      <h1 className={styles.title}>{t('onboarding.featuresTitle')}</h1>
      <ul className={styles.list}>
        <li className={styles.item}>{t('onboarding.featureTest')}</li>
        <li className={styles.item}>{t('onboarding.featureRoutine')}</li>
        <li className={styles.item}>{t('onboarding.featureScan')}</li>
        <li className={styles.item}>{t('onboarding.featureJournal')}</li>
      </ul>
    </section>
  );
}
