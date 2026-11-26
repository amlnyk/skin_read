import type { ReactNode } from 'react';
import styles from './Sheet.module.css';

type Props = {
  children: ReactNode;
};

// The white sheet of the test screens (Figma "sheet"): radius 28 at the top, soft shadow.
// It grows with its content and reaches the bottom of the screen.
export function Sheet({ children }: Props) {
  return <div className={styles.sheet}>{children}</div>;
}
