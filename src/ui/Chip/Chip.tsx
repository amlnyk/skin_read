import styles from './Chip.module.css';

type Props = {
  label: string;
  /** 'radio' for one answer, 'checkbox' for several. */
  kind: 'radio' | 'checkbox';
  name: string;
  value: string;
  selected: boolean;
  onChange: () => void;
  description?: string;
};

// A big tappable answer option. Built on a real radio or checkbox, so the keyboard and
// screen readers work without extra code.
export function Chip({ label, kind, name, value, selected, onChange, description }: Props) {
  return (
    <label className={`${styles.chip} ${selected ? styles.selected : ''}`}>
      <input
        className={styles.input}
        type={kind}
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
      />
      <span className={styles.label}>{label}</span>
      {description ? <span className={styles.description}>{description}</span> : null}
    </label>
  );
}
