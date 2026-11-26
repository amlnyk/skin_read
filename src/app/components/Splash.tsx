import { t } from '@/i18n';
import { Background, Logo } from '@/ui';
import styles from './Splash.module.css';

// The loading screen (Figma 01_Welcome), shown on every launch for about 3 seconds: the blobs
// drift, the logo appears, then the screen fades away by itself. Pure CSS, so nothing waits on
// a timer and the app under it loads in the meantime. Decoration only: hidden from screen readers.
export function Splash() {
  return (
    <div className={styles.splash} aria-hidden="true">
      <Background variant="splash" animated>
        <div className={styles.inner}>
          <div className={styles.logo}>
            <Logo variant="full" label={t('brand.name')} />
          </div>
        </div>
      </Background>
    </div>
  );
}
