import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { groupName, ingredientName } from '@/logic/analyze';
import type { ContentBundle } from '@/schemas';
import type { Product, ScanResult } from '@/types';
import styles from '../compare.module.css';

type Props = {
  product: Product;
  result: ScanResult;
  onlyGroupIds: readonly string[];
  onlyIngredientIds: readonly string[];
  content: Pick<ContentBundle, 'ingredients' | 'ingredientGroups'>;
  inCollection: boolean;
};

function names(ids: readonly string[], toName: (id: string) => string): string {
  return ids.length === 0 ? t('compare.nothing') : ids.map(toName).join(', ');
}

// One side of the comparison. On a narrow screen the two columns stack.
export function ProductColumn({
  product,
  result,
  onlyGroupIds,
  onlyIngredientIds,
  content,
  inCollection,
}: Props) {
  return (
    <article className={styles.column}>
      <h3>{product.name}</h3>
      {product.brand ? <p>{product.brand}</p> : null}
      <p className={styles.hint}>
        {t('compare.category', { name: t(`category.${product.category}`) })}
      </p>
      <p>
        <strong>{t('compare.statusTitle')}</strong>
      </p>
      <p>{t(`scan.status.${result.status}.title`)}</p>
      <h4>{t('compare.onlyGroups')}</h4>
      <p>
        {names(onlyGroupIds, (id) => groupName(id, content.ingredientGroups) ?? t('scan.pending'))}
      </p>
      <h4>{t('compare.onlyIngredients')}</h4>
      <p>{names(onlyIngredientIds, (id) => ingredientName(id, content.ingredients))}</p>
      {inCollection ? (
        <Link to={`/care/products/${product.id}`}>{t('compare.detailsLink')}</Link>
      ) : null}
    </article>
  );
}
