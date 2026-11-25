import { Link } from 'react-router-dom';
import { disclaimer } from '@/content';
import { t } from '@/i18n';
import { MedicalDisclaimer } from '@/ui';
import { ObservationCard } from '../components/ObservationCard';
import { describeRoutineObservation } from '../utils/describeObservation';
import { useRoutineAnalysis } from '../hooks/useRoutineAnalysis';
import styles from './AnalysisPage.module.css';

// "Аналіз мого догляду": what is wrong with the set of products and why. A list of observations
// with explanations, links to the products and the rule; no numbers and no overall grade.
export function AnalysisPage() {
  const { profile, products, observations, productCount, bundle } = useRoutineAnalysis();

  const back = (
    <Link to="/care" className={styles.back}>
      {t('analysis.back')}
    </Link>
  );

  if (!profile) {
    return (
      <section className={styles.page}>
        {back}
        <h1>{t('analysis.title')}</h1>
        <p>{t('analysis.needsProfile')}</p>
        <Link to="/test">{t('analysis.startTest')}</Link>
      </section>
    );
  }

  if (productCount === 0) {
    return (
      <section className={styles.page}>
        {back}
        <h1>{t('analysis.title')}</h1>
        <div className={styles.empty} role="status">
          <h2>{t('analysis.emptyTitle')}</h2>
          <p>{t('analysis.emptyText')}</p>
          <Link to="/care/products/new" className={styles.linkButton}>
            {t('analysis.emptyAdd')}
          </Link>
          <Link to="/care/products">{t('analysis.emptyCollection')}</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      {back}
      <h1>{t('analysis.title')}</h1>
      <p className={styles.hint}>{t('analysis.intro')}</p>

      {observations.length === 0 ? (
        <p role="status" className={styles.none}>
          {t('analysis.noneFound')}
        </p>
      ) : (
        <ul className={styles.list} aria-label={t('analysis.listLabel')}>
          {observations.map((observation) => (
            <li key={observation.id}>
              <ObservationCard view={describeRoutineObservation(observation, bundle, products)} />
            </li>
          ))}
        </ul>
      )}

      <MedicalDisclaimer text={disclaimer.text} />
    </section>
  );
}
