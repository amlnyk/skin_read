import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore } from '@/store';
import styles from '../scan.module.css';

// Профіль → «Історія перевірок»: the saved results, the newest first. A result made for an
// older profile is marked; the result screen explains it and offers "Перевірити знову".
export function HistoryPage() {
  const scans = useAppStore((state) => state.scans);
  const profile = useAppStore((state) => state.profile);
  const sorted = [...scans].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));

  return (
    <section className={styles.page}>
      <Link to="/profile" className={styles.back}>
        {t('scan.historyBack')}
      </Link>
      <h1>{t('scan.historyTitle')}</h1>
      {sorted.length === 0 ? <p>{t('scan.historyEmpty')}</p> : null}
      <ul className={styles.list}>
        {sorted.map((scan) => (
          <li key={scan.id} className={styles.item}>
            <p>
              {t('scan.historyItem', {
                name: scan.productSnapshot.name,
                date: new Date(scan.checkedAt).toLocaleDateString('uk-UA'),
              })}
            </p>
            <p>{t(`scan.status.${scan.status}.title`)}</p>
            {profile && scan.profileRevision !== profile.revision ? (
              <p className={styles.tag}>{t('scan.oldBannerTitle')}</p>
            ) : null}
            <Link to={`/scan/result/${scan.id}`}>{t('scan.historyOpen')}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
