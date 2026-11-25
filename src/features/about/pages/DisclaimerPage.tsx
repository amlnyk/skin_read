import { Link } from 'react-router-dom';
import { disclaimer } from '@/content';
import { t } from '@/i18n';
import { MedicalDisclaimer } from '@/ui';
import styles from '../styles/about.module.css';

export function DisclaimerPage() {
  return (
    <section className={styles.page}>
      <Link to="/profile" className={styles.back}>
        {t('disclaimerPage.back')}
      </Link>
      <h1>{t('disclaimerPage.title')}</h1>
      <MedicalDisclaimer text={disclaimer.text} />
      <p>{t('disclaimerPage.where')}</p>
      <nav className={styles.links} aria-label={t('about.moreLabel')}>
        <Link to="/profile/about">{t('disclaimerPage.aboutLink')}</Link>
      </nav>
    </section>
  );
}
