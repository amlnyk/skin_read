import type { Ingredient, ParsedIngredient, SkinProfile } from '@/types';
import type { Draft } from '../types';
import { isPossible, newDraft } from '../types';

// Step 4. Cautions written in the ingredient cards whose conditions match the profile.
// A caution without conditions is not about a person's state, so it is not used here.
// `key` is the index of the caution in the card: the screen shows the text from the content.

export function ingredientCautions(
  items: readonly ParsedIngredient[],
  profile: Pick<SkinProfile, 'conditions'>,
  ingredients: readonly Ingredient[],
): Draft[] {
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = item.ingredientId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const card = ingredients.find((entry) => entry.id === id);
    if (!card) continue;
    const same = items.filter((entry) => entry.ingredientId === id);
    card.cautions.forEach((caution, index) => {
      if (!caution.conditions.some((condition) => profile.conditions.includes(condition))) return;
      drafts.push(
        newDraft({
          kind: 'ingredient_caution',
          ingredientIds: [id],
          key: String(index),
          possible: same.every(isPossible),
        }),
      );
    });
  }
  return drafts;
}
