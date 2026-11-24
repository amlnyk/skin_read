import { t } from '@/i18n';
import styles from './EducationPlaceholder.module.css';

// The tab of educational materials is empty for now: the materials come later.
export function EducationPlaceholder() {
  return (
    <section className={styles.box}>
      <h2>{t('reference.educationTitle')}</h2>
      <p>{t('reference.educationEmpty')}</p>
    </section>
  );
}
