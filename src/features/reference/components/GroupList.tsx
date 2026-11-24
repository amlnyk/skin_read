import { t } from '@/i18n';
import { ingredientsOfGroup } from '@/logic/inci';
import type { Ingredient, IngredientGroup } from '@/schemas';
import { IngredientCard } from './IngredientCard';
import styles from './GroupList.module.css';

type Props = {
  groups: readonly IngredientGroup[];
  ingredients: readonly Ingredient[];
  /** Show the cards of the group's ingredients. Search results turn this off: the found cards are listed apart. */
  withMembers?: boolean;
};

// The groups, each one opens to its description and the cards of its ingredients.
export function GroupList({ groups, ingredients, withMembers = true }: Props) {
  return (
    <ul className={styles.list}>
      {groups.map((group) => {
        const members = ingredientsOfGroup(group.id, { ingredients });
        return (
          <li key={group.id}>
            <details className={styles.group}>
              <summary className={styles.summary}>
                <span>{group.nameUk ?? t('common.contentPending')}</span>
                <span className={styles.count}>
                  {t('reference.groupCount', { count: members.length })}
                </span>
              </summary>
              <div className={styles.body}>
                <p>{group.description ?? t('common.contentPending')}</p>
                {!withMembers ? null : members.length > 0 ? (
                  members.map((ingredient) => (
                    <IngredientCard key={ingredient.id} ingredient={ingredient} all={ingredients} />
                  ))
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
