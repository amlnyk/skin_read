import { t } from '@/i18n';
import type { Ingredient } from '@/types';
import { Button, Modal } from '@/ui';
import styles from './IngredientSheet.module.css';

type Props = {
  ingredient: Ingredient | null;
  /** The name as the label wrote it, for a component that has no card. */
  fallbackName: string;
  onClose: () => void;
};

const filled = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== '';

// A component of the scanned product in plain words, for ordinary people: what it is, what it
// does in the product and what to keep in mind. The texts come from the content (written by the
// cosmetologist); until they are there, the sheet says so and invents nothing.
export function IngredientSheet({ ingredient, fallbackName, onClose }: Props) {
  const name = filled(ingredient?.nameUk) ? ingredient.nameUk : fallbackName;
  const rows = [
    { label: t('scan.plainWhat'), value: ingredient?.plainWhat },
    { label: t('scan.plainPurpose'), value: ingredient?.purpose },
    { label: t('scan.plainCaution'), value: ingredient?.plainCaution },
  ];
  const nothing = rows.every((row) => !filled(row.value));

  return (
    <Modal
      title={name}
      onClose={onClose}
      actions={
        <Button fullWidth onClick={onClose}>
          {t('scan.plainClose')}
        </Button>
      }
    >
      {ingredient ? <p className={styles.inci}>{ingredient.inci}</p> : null}
      {nothing ? (
        <p className={styles.pending}>{t('scan.plainPending')}</p>
      ) : (
        <dl className={styles.list}>
          {rows.map((row) =>
            filled(row.value) ? (
              <div key={row.label} className={styles.row}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}
    </Modal>
  );
}
