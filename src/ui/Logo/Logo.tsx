import logoCompact from './logo-compact.svg';
import logoFull from './logo-full.svg';
import styles from './Logo.module.css';

type Props = {
  /** "full": the large mark of the splash screen (284 x 76); "compact": the header mark (104 x 64). */
  variant?: 'full' | 'compact';
  /** Text for screen readers. The caller passes it from t(), so the brand name is not hardcoded here. */
  label: string;
};

// The Skinread logo. The SVG files are exported from Figma by the author (outlined letters),
// so the logo looks the same without the Geologica font and must not be redrawn in code.
export function Logo({ variant = 'full', label }: Props) {
  const isFull = variant === 'full';
  return (
    <img
      className={isFull ? styles.full : styles.compact}
      src={isFull ? logoFull : logoCompact}
      width={isFull ? 284 : 104}
      height={isFull ? 76 : 64}
      alt={label}
    />
  );
}
