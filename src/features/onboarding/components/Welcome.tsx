import { t } from '@/i18n';
import styles from '../styles/onboarding.module.css';

// Figma 02_Welcome: hero "Зрозумій свою шкіру." with the last word in purple, then the slogan.
export function Welcome() {
  const title = t('onboarding.welcomeTitle');
  const split = title.lastIndexOf(' ');
  return (
    <section className={styles.welcome}>
      <h1 className={styles.hero}>
        {title.slice(0, split + 1)}
        <span className={styles.accent}>{title.slice(split + 1)}</span>
      </h1>
      <p className={styles.slogan}>{t('onboarding.welcomeText')}</p>
    </section>
  );
}
