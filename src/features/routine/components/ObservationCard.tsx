import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import type { ObservationView } from '../describeObservation';
import styles from '../pages/AnalysisPage.module.css';
import { SeverityIcon } from './SeverityIcon';

// One observation: its degree in words, what was found, why, the facts the analysis knows and
// links to the products it is about. No numbers, no verdicts.
export function ObservationCard({ view }: { view: ObservationView }) {
  const title = t(`analysis.kind.${view.kind}`);
  return (
    <article className={styles.card} aria-label={title}>
      <p className={styles.degree}>
        <SeverityIcon severity={view.severity} />
        <span>{t(`analysis.severity.${view.severity}`)}</span>
      </p>
      <h2 className={styles.kind}>{title}</h2>
      <p>{view.text}</p>

      {view.products.length > 0 ? (
        <p className={styles.products}>
          <span>
            {t('analysis.productsLabel')}
            {': '}
          </span>
          {view.products.map((product, index) => (
            <span key={product.id}>
              {index > 0 ? ', ' : ''}
              <Link to={`/care/products/${product.id}`}>{product.name}</Link>
            </span>
          ))}
        </p>
      ) : null}

      {view.facts.length > 0 ? (
        <ul className={styles.facts}>
          {view.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : null}

      <p>
        <strong>
          {t('analysis.whyLabel')}
          {': '}
        </strong>
        {view.why}
      </p>
      {view.ruleSource ? (
        <p className={styles.hint}>{t('analysis.ruleSource', { source: view.ruleSource })}</p>
      ) : null}
    </article>
  );
}
