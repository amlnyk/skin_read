import styles from './BackButton.module.css';

type Props = {
  onClick: () => void;
  /** Accessible name, for example "Back". */
  label: string;
};

// The round "back" button of the test screens: 44 circle, white 70% with a backdrop blur,
// chevron 18. In Figma it is not a component yet (see docs/design/DESIGN_SYSTEM.md).
export function BackButton({ onClick, label }: Props) {
  return (
    <button type="button" className={styles.button} onClick={onClick} aria-label={label}>
      <svg className={styles.icon} viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <path
          d="M11 4 6 9l5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
