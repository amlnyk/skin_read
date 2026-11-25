import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import styles from '../about.module.css';

export function PrivacyPage() {
  return (
    <section className={styles.page}>
      <Link to="/profile" className={styles.back}>
        {t('privacy.back')}
      </Link>
      <h1>{t('privacy.title')}</h1>
      <p>{t('privacy.intro')}</p>

      <section className={styles.section} aria-labelledby="privacy-which">
        <h2 id="privacy-which">{t('privacy.whichTitle')}</h2>
        <ul className={styles.list}>
          <li>{t('privacy.which1')}</li>
          <li>{t('privacy.which2')}</li>
          <li>{t('privacy.which3')}</li>
          <li>{t('privacy.which4')}</li>
          <li>{t('privacy.which5')}</li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="privacy-where">
        <h2 id="privacy-where">{t('privacy.whereTitle')}</h2>
        <p>{t('privacy.whereText')}</p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-server">
        <h2 id="privacy-server">{t('privacy.serverTitle')}</h2>
        <p>{t('privacy.serverText')}</p>
        <p>{t('privacy.serverNever')}</p>
        <p>{t('privacy.serverLimit')}</p>
        <p>{t('privacy.consentText')}</p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-photo">
        <h2 id="privacy-photo">{t('privacy.photoTitle')}</h2>
        <p>{t('privacy.photoText')}</p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-no">
        <h2 id="privacy-no">{t('privacy.noTitle')}</h2>
        <p>{t('privacy.noText')}</p>
      </section>

      <section className={styles.section} aria-labelledby="privacy-offline">
        <h2 id="privacy-offline">{t('privacy.offlineTitle')}</h2>
        <p>{t('privacy.offlineText')}</p>
      </section>

      <nav className={styles.links} aria-label={t('privacy.manageTitle')}>
        <Link to="/profile/settings/data">{t('privacy.manageData')}</Link>
        <Link to="/profile/settings/consents">{t('privacy.manageConsents')}</Link>
      </nav>
    </section>
  );
}
