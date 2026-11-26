import type { ReactNode } from 'react';
import styles from './Sheet.module.css';

type Props = {
  children: ReactNode;
  /** The sheet scrolls inside itself, so what is above it (the test header) stays in place. */
  scroll?: boolean;
};

// The white sheet of the test screens (Figma "sheet"): radius 28 at the top, soft shadow.
// It grows with its content and reaches the bottom of the screen.
export function Sheet({ children, scroll = false }: Props) {
  return (
    <div className={scroll ? `${styles.sheet} ${styles.scroll}` : styles.sheet}>{children}</div>
  );
}
