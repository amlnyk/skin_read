import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore, useAppStoreApi } from '@/store';
import { Button } from '@/ui';
import { formatDate } from '../format';
import styles from '../settings.module.css';

// What the user has allowed. Nothing is switched on by default. The photo reader itself comes
// later; here the consent can already be seen and taken back.
export function ConsentsPage() {
  const store = useAppStoreApi();
  const photo = useAppStore((state) => state.settings.consents.photoToAi);

  const revoke = () => {
    store.getState().actions.settings.update({
      consents: { photoToAi: { granted: false, at: null } },
    });
  };

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/profile/settings">
        {t('settings.back')}
      </Link>
      <h1>{t('settings.consentsTitle')}</h1>
      <p>{t('settings.consentsIntro')}</p>

      <div className={styles.card}>
        <h2>{t('settings.photoTitle')}</h2>
        {photo.granted ? (
          <>
            <p>
              {photo.at
                ? t('settings.photoGranted', { date: formatDate(photo.at) })
                : t('settings.photoGrantedNoDate')}
            </p>
            <Button variant="secondary" fullWidth onClick={revoke}>
              {t('settings.photoRevoke')}
            </Button>
          </>
        ) : (
          <p>{t('settings.photoNotGranted')}</p>
        )}
        <p className={styles.hint}>{t('settings.photoLater')}</p>
      </div>
    </section>
  );
}
