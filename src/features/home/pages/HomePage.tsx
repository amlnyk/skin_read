import { Link } from 'react-router-dom';
import { disclaimer } from '@/content';
import { t } from '@/i18n';
import { DoctorBanner, MedicalDisclaimer } from '@/ui';
import styles from '../styles/home.module.css';
import { useHomeSummary } from '../hooks/useHomeSummary';

// The home screen (ТЗ, розділ 27): the state of the profile, the routine for now, what to look
// for, quick access to the scanner. It only summarises; the details live on their own screens.
export function HomePage() {
  const home = useHomeSummary();

  return (
    <section className={styles.page}>
      <h1>{t('nav.home')}</h1>

      {home.profile === null ? (
        <section className={styles.card}>
          <p>{t('home.welcome')}</p>
          <Link to="/test" className={styles.primary}>
            {t('home.startTest')}
          </Link>
        </section>
      ) : (
        <>
          {home.mode === 'see_doctor' || home.mode === 'emergency' ? (
            <DoctorBanner message={home.seeDoctorText} />
          ) : null}

          <section className={styles.card} aria-labelledby="home-profile">
            <h2 id="home-profile">{t('home.profileTitle')}</h2>
            <p>
              {home.typeName ? t('home.typeLabel', { name: home.typeName }) : t('home.typeUnsure')}
            </p>
            {home.conditionNames.length > 0 ? (
              <p>{t('home.conditionsLabel', { names: home.conditionNames.join(', ') })}</p>
            ) : null}
            {home.restrictionCount > 0 ? (
              <p>{t('home.restrictionsCount', { count: home.restrictionCount })}</p>
            ) : null}
            <Link to="/profile" className={styles.link}>
              {t('home.profileLink')}
            </Link>
          </section>

          <section className={styles.card} aria-labelledby="home-care">
            <h2 id="home-care">
              {home.slot === 'am' ? t('home.careTitleAm') : t('home.careTitlePm')}
            </h2>
            {home.stepCategories.length === 0 ? (
              <>
                <p>{t('home.careEmpty')}</p>
                <Link to="/care" className={styles.link}>
                  {t('home.careBuild')}
                </Link>
              </>
            ) : (
              <>
                <p>
                  {t('home.careSteps', {
                    names: home.stepCategories
                      .map((category) => t(`category.${category}`))
                      .join(', '),
                  })}
                </p>
                <p>
                  {t('home.careDone', { done: home.doneCount, total: home.stepCategories.length })}
                </p>
                <Link to="/care" className={styles.link}>
                  {t('home.careLink')}
                </Link>
              </>
            )}
          </section>

          <section className={styles.card} aria-labelledby="home-needs">
            <h2 id="home-needs">{t('home.needsTitle')}</h2>
            <p>
              {home.openNeeds.length > 0
                ? t('home.needsList', {
                    names: home.openNeeds.map((category) => t(`category.${category}`)).join(', '),
                  })
                : t('home.needsNone')}
            </p>
          </section>
        </>
      )}

      <nav className={styles.quick} aria-label={t('home.quickTitle')}>
        <Link to="/scan" className={styles.primary}>
          {t('home.quickScan')}
        </Link>
        {home.profile !== null ? (
          <Link to="/profile/journal" className={styles.link}>
            {t('home.quickJournal')}
          </Link>
        ) : null}
      </nav>

      <MedicalDisclaimer text={disclaimer.text} />
    </section>
  );
}
