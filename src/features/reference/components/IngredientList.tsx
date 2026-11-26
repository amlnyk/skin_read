import { useState } from 'react';
import { t } from '@/i18n';
import type { Ingredient } from '@/schemas';
import { Button, Modal } from '@/ui';
import { IngredientCard } from './IngredientCard';
import styles from './IngredientList.module.css';

type Props = {
  ingredients: readonly Ingredient[];
  /** Every visible ingredient: known interactions are shown by name. */
  all: readonly Ingredient[];
};

const hasText = (value: string | null): value is string => value !== null && value.trim() !== '';

// A short list of ingredient names. A tap on a name opens its card in a modal,
// so a long list stays short on the screen.
export function IngredientList({ ingredients, all }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = ingredients.find((item) => item.id === openId) ?? null;

  return (
    <>
      <ul className={styles.list}>
        {ingredients.map((ingredient) => (
          <li key={ingredient.id}>
            <button
              type="button"
              className={styles.row}
              aria-haspopup="dialog"
              onClick={() => setOpenId(ingredient.id)}
            >
              <span className={styles.name}>
                {hasText(ingredient.nameUk) ? ingredient.nameUk : t('common.contentPending')}
              </span>
              <span className={styles.inci}>{ingredient.inci}</span>
            </button>
          </li>
        ))}
      </ul>
      {opened === null ? null : (
        <Modal
          title={hasText(opened.nameUk) ? opened.nameUk : t('common.contentPending')}
          onClose={() => setOpenId(null)}
          actions={
            <Button variant="secondary" fullWidth onClick={() => setOpenId(null)}>
              {t('reference.closeCard')}
            </Button>
          }
        >
          <IngredientCard ingredient={opened} all={all} withTitle={false} />
        </Modal>
      )}
    </>
  );
}
