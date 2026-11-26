import { t } from '@/i18n';
import { Background, Logo } from '@/ui';
import styles from '../styles/onboarding.module.css';

// Figma 01_Welcome: the big logo on its own background. It covers the Welcome screen for a
// moment and fades away by itself (CSS only, so nothing waits on a timer). Decoration: the
// Welcome screen under it is what screen readers and the keyboard get.
export function Splash() {
  return (
    <div className={styles.splash} aria-hidden="true">
      <Background variant="splash">
        <div className={styles.splashInner}>
          <Logo variant="full" label={t('brand.name')} />
        </div>
      </Background>
    </div>
  );
}
