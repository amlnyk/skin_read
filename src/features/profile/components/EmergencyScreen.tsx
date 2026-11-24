import { t } from '@/i18n';
import { Button } from '@/ui';
import styles from './EmergencyScreen.module.css';

type Props = {
  /** The approved text from content; null while it is not there. */
  message: string | null;
  onAcknowledge: () => void;
};

// Only the emergency message, the number and one button. Nothing else is shown until the user
// confirms that they have read it.
export function EmergencyScreen({ message, onAcknowledge }: Props) {
  return (
    <main className={styles.page}>
      <div role="alert">
        <h1>{t('profile.emergencyHeading')}</h1>
        <p className={styles.message}>{message ?? t('common.contentPending')}</p>
      </div>
      <p>
        {`${t('profile.emergencyNumberLabel')}: `}
        <a className={styles.number} href={`tel:${t('profile.emergencyNumber')}`}>
          {t('profile.emergencyNumber')}
        </a>
      </p>
      <Button fullWidth onClick={onAcknowledge}>
        {t('profile.emergencyAck')}
      </Button>
    </main>
  );
}
