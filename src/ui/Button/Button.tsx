import type { ReactNode } from 'react';
import styles from './Button.module.css';

type Props = {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  fullWidth?: boolean;
  disabled?: boolean;
  /** A longer name for screen readers, for buttons whose visible text is short ("Up"). */
  ariaLabel?: string;
};

// A plain button at least 44 px high (thumb friendly). Text comes from the caller.
export function Button({
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  ariaLabel,
}: Props) {
  const className = [styles.button, styles[variant], fullWidth ? styles.fullWidth : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
