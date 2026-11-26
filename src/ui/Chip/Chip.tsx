import { useId } from 'react';
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
  /**
   * 'row': Test / OptionRow from Figma (29:749), a row inside a sheet, separated by dividers.
   * 'card': the same row with a hairline border, for options that stand on their own.
   */
  appearance?: 'row' | 'card';
};

// An answer option: title, optional description and the control on the right (Test / Radio,
// Test / Checkbox in Figma). Built on a real radio or checkbox, so the keyboard and screen
// readers work without extra code.
export function Chip({
  label,
  kind,
  name,
  value,
  selected,
  onChange,
  description,
  appearance = 'card',
}: Props) {
  // The name is the title only; the description is read as a description.
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const className = [styles.chip, styles[appearance], selected ? styles.selected : '']
    .filter(Boolean)
    .join(' ');
  return (
    <label className={className} data-selected={selected ? 'true' : 'false'}>
      <input
        className={styles.input}
        type={kind}
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
      />
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      {description ? (
        <span id={descriptionId} className={styles.description}>
          {description}
        </span>
      ) : null}
      <span
        className={`${styles.control} ${kind === 'radio' ? styles.radio : styles.checkbox}`}
        aria-hidden="true"
      >
        {selected ? (
          <svg className={styles.check} viewBox="0 0 14 14" width="14" height="14">
            <path
              d="M3 7.4 5.8 10 11 4.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </label>
  );
}
