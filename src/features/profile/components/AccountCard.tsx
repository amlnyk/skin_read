import { t } from '@/i18n';
import { useAppStore } from '@/store';
import { Button } from '@/ui';
import styles from './AccountCard.module.css';

// The local account: shows the email from the login screen and lets the user sign out.
// Signing out only forgets the email; the skin profile and the routine stay on the device.
export function AccountCard() {
  const email = useAppStore((state) => state.onboarding.accountEmail);
  const setOnboarding = useAppStore((state) => state.actions.onboarding.set);
  if (!email) return null;
  return (
    <div className={styles.card}>
      <div className={styles.text}>
        <span className={styles.label}>{t('account.label')}</span>
        <span className={styles.email}>{email}</span>
      </div>
      <Button variant="text" onClick={() => setOnboarding({ accountEmail: undefined })}>
        {t('account.signOut')}
      </Button>
    </div>
  );
}
