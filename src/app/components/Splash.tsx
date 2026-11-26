import { t } from '@/i18n';
import { Background, Logo } from '@/ui';
import styles from './Splash.module.css';

// The loading screen (Figma 01_Welcome), shown on every launch for 2 seconds: the blobs
// drift, the logo appears, a purple bar scans the word "read" like a scanner and settles in its
// place from the logo, then the screen fades away by itself. Pure CSS, so nothing waits on
// a timer and the app under it loads in the meantime. Decoration only: hidden from screen readers.
export function Splash() {
  return (
    <div className={styles.splash} aria-hidden="true">
      <Background variant="splash" animated>
        <div className={styles.inner}>
          <div className={styles.logo}>
            <Logo variant="scan" label={t('brand.name')} />
            <span className={styles.scanBar} />
          </div>
        </div>
      </Background>
    </div>
  );
}
