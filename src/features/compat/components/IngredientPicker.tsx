import { useId, useMemo, useState } from 'react';
import { t } from '@/i18n';
import { searchGroups, searchIngredients } from '@/logic/inci';
import type { CompatSubject } from '@/logic/compat';
import { LIMITS } from '@/schemas';
import { subjectName, type CompatLabelContent } from '../utils/labels';
import styles from './IngredientPicker.module.css';

type Props = {
  content: CompatLabelContent;
  selected: readonly CompatSubject[];
  onToggle: (subject: CompatSubject) => void;
  /** How many components can be chosen at most. */
  max: number;
};

const isSelected = (selected: readonly CompatSubject[], subject: CompatSubject) =>
  selected.some((entry) => entry.kind === subject.kind && entry.id === subject.id);

// Search and choose components and groups. Each choice is a toggle button (aria-pressed).
export function IngredientPicker({ content, selected, onToggle, max }: Props) {
  const searchId = useId();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => searchGroups(query, content), [query, content]);
  const ingredients = useMemo(() => searchIngredients(query, content), [query, content]);
  const full = selected.length >= max;

  const options: CompatSubject[] = [
    ...groups.map((group): CompatSubject => ({ kind: 'group', id: group.id })),
    ...ingredients.map((ingredient): CompatSubject => ({ kind: 'ingredient', id: ingredient.id })),
  ];

  return (
    <div className={styles.picker}>
      <div className={styles.field}>
        <label htmlFor={searchId}>{t('compat.searchLabel')}</label>
        <input
          id={searchId}
          type="search"
          className={styles.input}
          value={query}
          maxLength={LIMITS.name}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className={styles.hint}>{t('compat.searchHint')}</span>
      </div>

      {full ? (
        <p role="status" className={styles.hint}>
          {t('compat.limitReached', { count: max })}
        </p>
      ) : null}

      {options.length === 0 ? (
        <p role="status" className={styles.hint}>
          {t('compat.nothingFound')}
        </p>
      ) : (
        <ul className={styles.options}>
          {options.map((option) => {
            const chosen = isSelected(selected, option);
            const name = subjectName(option, content);
            return (
              <li key={`${option.kind}-${option.id}`}>
                <button
                  type="button"
                  className={chosen ? `${styles.option} ${styles.chosen}` : styles.option}
                  aria-pressed={chosen}
                  disabled={!chosen && full}
                  onClick={() => onToggle(option)}
                >
                  <span>{name}</span>
                  <span className={styles.kind}>
                    {option.kind === 'group' ? t('compat.kindGroup') : t('compat.kindIngredient')}
                    {chosen ? ` · ${t('compat.pickedMark')}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
