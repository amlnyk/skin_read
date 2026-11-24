import { t } from '@/i18n';
import styles from './DoctorBanner.module.css';

type Props = {
  /** The approved text from content; null while it is not there. */
  message: string | null;
};

// The first thing on the screen when the answers call for a doctor.
export function DoctorBanner({ message }: Props) {
  return (
    <div className={styles.banner} role="alert">
      <h2>{t('profile.doctorBannerTitle')}</h2>
      <p>{message ?? t('common.contentPending')}</p>
    </div>
  );
}
