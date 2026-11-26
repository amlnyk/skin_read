import type { ReactNode } from 'react';
import styles from './Background.module.css';

/** Blob layouts copied from the "фон" groups of the Figma frames. */
export type BackgroundVariant = 'splash' | 'welcome' | 'sheet' | 'analysis';

type Props = {
  variant: BackgroundVariant;
  /** The blobs drift slowly, overlap and breathe in size (off with reduced motion). */
  animated?: boolean;
  children?: ReactNode;
};

// White screen with three strongly blurred color blobs (blue, purple, coral).
// Positions and sizes live in Background.module.css per variant; colors come from tokens.css.
// The blobs are decoration only, so they are hidden from screen readers.
export function Background({ variant, animated = false, children }: Props) {
  const className = [styles.root, styles[variant], animated ? styles.animated : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={className}>
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
