import { t } from '@/i18n';
import { ingredientsOfGroup } from '@/logic/inci';
import type { Ingredient, IngredientGroup } from '@/schemas';
import { IngredientList } from './IngredientList';
import styles from './GroupList.module.css';

type Props = {
  groups: readonly IngredientGroup[];
  ingredients: readonly Ingredient[];
  /** Show the ingredients of the group. Search results turn this off: the found cards are listed apart. */
  withMembers?: boolean;
  /** Open every group at once. Used when a single group was picked in the filter. */
  open?: boolean;
};

// The groups, each one opens to its description and the cards of its ingredients.
export function GroupList({ groups, ingredients, withMembers = true, open = false }: Props) {
  return (
    <ul className={styles.list}>
      {groups.map((group) => {
        const members = ingredientsOfGroup(group.id, { ingredients });
        return (
          <li key={group.id}>
            <details className={styles.group} open={open}>
              <summary className={styles.summary}>
                <span>{group.nameUk ?? t('common.contentPending')}</span>
                <span className={styles.count}>
                  {t('reference.groupCount', { count: members.length })}
                </span>
              </summary>
              <div className={styles.body}>
                <p>{group.description ?? t('common.contentPending')}</p>
                {!withMembers ? null : members.length > 0 ? (
                  <IngredientList ingredients={members} all={ingredients} />
                ) : (
                  <p className={styles.empty}>{t('reference.groupEmpty')}</p>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
