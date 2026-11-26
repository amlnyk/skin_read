import logoCompact from './logo-compact.svg';
import logoFull from './logo-full.svg';
// The same mark without the purple bar: the splash screen draws the bar itself and animates it.
import logoScan from './logo-scan.svg';
import styles from './Logo.module.css';

type Props = {
  /** "full": the large mark (284 x 76); "scan": the same without the purple bar (the splash
   *  animates it); "compact": the header mark (104 x 64). */
  variant?: 'full' | 'scan' | 'compact';
  /** Text for screen readers. The caller passes it from t(), so the brand name is not hardcoded here. */
  label: string;
};

// The Skinread logo. The SVG files are exported from Figma by the author (outlined letters),
// so the logo looks the same without the Geologica font and must not be redrawn in code.
export function Logo({ variant = 'full', label }: Props) {
  const isFull = variant !== 'compact';
  const src = variant === 'scan' ? logoScan : isFull ? logoFull : logoCompact;
  return (
    <img
      className={isFull ? styles.full : styles.compact}
      src={src}
      width={isFull ? 284 : 104}
      height={isFull ? 76 : 64}
      alt={label}
    />
  );
}
