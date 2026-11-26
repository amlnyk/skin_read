import { disclaimer } from '@/content';
import { t } from '@/i18n';
import { MedicalDisclaimer } from '@/ui';
import styles from '../styles/onboarding.module.css';

// The disclaimer text is domain content (src/content/data/disclaimer.json), the rest is interface text.
export function Limits() {
  return (
    <section className={styles.step}>
      <h1 className={styles.title}>{t('onboarding.limitsTitle')}</h1>
      <div className={styles.card}>
        <MedicalDisclaimer text={disclaimer.text} />
        <p className={styles.secondary}>{t('onboarding.limitsData')}</p>
      </div>
    </section>
  );
}
