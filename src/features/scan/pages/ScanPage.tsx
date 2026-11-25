import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { useAppStore } from '@/store';
import styles from '../scan.module.css';

// "Сканер": the entrance. Pasting or typing a composition always works. The label photo is a
// third way, offered only where the build has it switched on (VITE_FEATURE_PHOTO_SCAN).
export function ScanPage() {
  const profile = useAppStore((state) => state.profile);
  const { features } = useServices();

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
        {features.photoScan ? (
          <Link to="/scan/photo" className={styles.linkButton}>
            {t('scan.photoLink')}
          </Link>
        ) : (
          <button type="button" className={`${styles.linkButton} ${styles.disabled}`} disabled>
            {`${t('scan.photoLink')}: ${t('scan.photoSoon')}`}
          </button>
        )}
        <Link to="/care/products/new" className={styles.linkButton}>
          {t('scan.manualLink')}
        </Link>
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
