import type { ReactNode } from 'react';
import styles from './Background.module.css';

/** Blob layouts copied from the "фон" groups of the Figma frames. */
export type BackgroundVariant = 'splash' | 'welcome' | 'sheet' | 'analysis';

type Props = {
  variant: BackgroundVariant;
  children?: ReactNode;
};

// White screen with three strongly blurred color blobs (blue, purple, coral).
// Positions and sizes live in Background.module.css per variant; colors come from tokens.css.
// The blobs are decoration only, so they are hidden from screen readers.
export function Background({ variant, children }: Props) {
  return (
    <div className={`${styles.root} ${styles[variant]}`}>
      <div className={styles.layer} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blue}`} />
        <span className={`${styles.blob} ${styles.purple}`} />
        <span className={`${styles.blob} ${styles.coral}`} />
        <span className={styles.veil} />
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
