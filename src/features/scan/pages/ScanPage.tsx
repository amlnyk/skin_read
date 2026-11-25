import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore } from '@/store';
import styles from '../scan.module.css';

// "Сканер": the entrance. Pasting a composition works; the label photo is only announced.
export function ScanPage() {
  const profile = useAppStore((state) => state.profile);

  return (
    <section className={styles.page}>
      <h1>{t('scan.title')}</h1>
      <p>{t('scan.intro')}</p>
      {!profile ? (
        <p role="status">
          {t('scan.noProfile')} <Link to="/test">{t('home.startTest')}</Link>
        </p>
      ) : null}

      <div className={styles.actions}>
        <Link to="/scan/paste" className={styles.linkButton}>
          {t('scan.pasteLink')}
        </Link>
        <button type="button" className={`${styles.linkButton} ${styles.disabled}`} disabled>
          {`${t('scan.photoLink')}: ${t('scan.photoSoon')}`}
        </button>
        <Link to="/care/products" className={styles.linkButton}>
          {t('scan.myProducts')}
        </Link>
        <Link to="/profile/history" className={styles.linkButton}>
          {t('scan.history')}
        </Link>
      </div>
    </section>
  );
}
