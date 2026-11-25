import type { IngredientGroup, ParsedIngredient, Product, Routine } from '@/types';
import type { Draft } from '../types';
import { isPossible, newDraft } from '../types';

// Step 6. The same active group in the product and in a product that is already in the routine.
// Only groups the content marks as "active" are looked at (`active: true`). While the
// cosmetologist has not marked any group, nothing is reported: we do not guess what is active.

export function duplicateActives(
  product: Pick<Product, 'id'>,
  items: readonly ParsedIngredient[],
  routines: readonly Routine[],
  products: readonly Product[],
  groups: readonly IngredientGroup[],
): Draft[] {
  const drafts: Draft[] = [];
  const others = [
    ...new Set(
      routines
        .flatMap((routine) => routine.steps.map((step) => step.productId))
        .filter((id): id is string => id !== undefined && id !== product.id),
    ),
  ]
    .map((id) => products.find((entry) => entry.id === id))
    .filter((entry): entry is Product => entry !== undefined);

  for (const group of groups) {
    if (group.active !== true) continue;
    const mine = items.filter(
      (item) => item.matchType !== 'unknown' && item.groupIds.includes(group.id),
    );
    if (mine.length === 0) continue;
    const sharing = others.filter((other) =>
      other.ingredients.some(
        (item) =>
          item.matchType !== 'unknown' && !isPossible(item) && item.groupIds.includes(group.id),
      ),
    );
    if (sharing.length === 0) continue;
    drafts.push(
      newDraft({
        kind: 'duplicate_active',
        groupIds: [group.id],
        ingredientIds: [
          ...new Set(mine.flatMap((item) => (item.ingredientId ? [item.ingredientId] : []))),
        ],
        productIds: sharing.map((other) => other.id),
        possible: mine.every(isPossible),
      }),
    );
  }
  return drafts;
}
