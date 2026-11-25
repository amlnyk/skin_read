import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <section className={styles.page}>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.text')}</p>
      <Link to="/" className={styles.link}>
        {t('notFound.toHome')}
      </Link>
    </section>
  );
}
