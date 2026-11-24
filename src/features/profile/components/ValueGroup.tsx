import type { ReactNode } from 'react';
import { t } from '@/i18n';
import styles from './ValueGroup.module.css';

type Props = {
  title: string;
  values: readonly string[];
  /** A button or link shown next to the title (for example "Change"). */
  action?: ReactNode;
};

// A titled list of values. Nothing chosen is said plainly, not left empty.
export function ValueGroup({ title, values, action }: Props) {
  return (
    <section className={styles.group}>
      <div className={styles.header}>
        <h2>{title}</h2>
        {action}
      </div>
      {values.length > 0 ? (
        <ul>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t('profile.notSpecified')}</p>
      )}
    </section>
  );
}
