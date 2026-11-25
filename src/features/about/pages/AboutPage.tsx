import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION, CONTENT_UPDATED_AT } from '@/content';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import styles from '../styles/about.module.css';
import { summarizeContent } from '../utils/summarizeContent';

export function AboutPage() {
  const { content } = useServices();
  const summary = useMemo(() => summarizeContent(content.bundle), [content.bundle]);

  return (
    <section className={styles.page}>
      <Link to="/profile" className={styles.back}>
        {t('about.back')}
      </Link>
      <h1>{t('about.title')}</h1>

      <section className={styles.section}>
        <h2>{t('about.whatTitle')}</h2>
        <p>{t('about.whatText')}</p>
      </section>
      <section className={styles.section}>
        <h2>{t('about.forWhomTitle')}</h2>
        <p>{t('about.forWhomText')}</p>
      </section>
      <section className={styles.section}>
        <h2>{t('about.independenceTitle')}</h2>
        <p>{t('about.independenceText')}</p>
      </section>

      <section className={styles.section} aria-labelledby="about-sources">
        <h2 id="about-sources">{t('about.sourcesTitle')}</h2>
        <p>{t('about.sourcesIntro')}</p>
        {summary.sources.length === 0 ? (
          <p>{t('about.sourcesEmpty')}</p>
        ) : (
          <ul className={styles.list}>
            {summary.sources.map((source) => (
              <li key={source.name}>
                {`${source.name}. ${t('about.sourceRecords', { count: source.count })}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-labelledby="about-status">
        <h2 id="about-status">{t('about.statusTitle')}</h2>
        <ul className={styles.list}>
          <li>{t('about.statusVerified', { count: summary.statuses.verified })}</li>
          <li>{t('about.statusDraft', { count: summary.statuses.draft })}</li>
          <li>{t('about.statusPlaceholder', { count: summary.statuses.placeholder })}</li>
        </ul>
        <p>{content.policy === 'public' ? t('about.policyPublic') : t('about.policyDemo')}</p>
      </section>

      <section className={styles.section} aria-labelledby="about-versions">
        <h2 id="about-versions">{t('about.versionsTitle')}</h2>
        <ul className={styles.list}>
          <li>{t('about.appVersion', { version: APP_VERSION })}</li>
          <li>{t('about.contentVersion', { version: content.version })}</li>
          <li>
            {t('about.contentUpdated', {
              date: new Date(CONTENT_UPDATED_AT).toLocaleDateString('uk-UA'),
            })}
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="about-limits">
        <h2 id="about-limits">{t('about.limitsTitle')}</h2>
        <ul className={styles.list}>
          <li>{t('about.limitNotMedical')}</li>
          <li>{t('about.limitOcr')}</li>
          <li>{t('about.limitConcentration')}</li>
          <li>{t('about.limitData')}</li>
        </ul>
      </section>

      <nav className={styles.links} aria-label={t('about.moreLabel')}>
        <Link to="/profile/privacy">{t('about.privacyLink')}</Link>
        <Link to="/profile/disclaimer">{t('about.disclaimerLink')}</Link>
      </nav>
    </section>
  );
}
