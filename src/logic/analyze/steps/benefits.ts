import { goalSchema } from '@/schemas';
import type { Benefit, Goal, Ingredient, ParsedIngredient } from '@/types';
import { isRecognized } from '../types';

// Step 7. Potential benefits: an ingredient card says it `supports` a goal and the profile has
// that goal. Content only, confirmed matches only, and never a promise of a result.

export function benefits(
  items: readonly ParsedIngredient[],
  goals: readonly Goal[],
  ingredients: readonly Ingredient[],
): Benefit[] {
  const result: Benefit[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = item.ingredientId;
    if (!id || !isRecognized(item) || seen.has(id)) continue;
    seen.add(id);
    const card = ingredients.find((entry) => entry.id === id);
    if (!card) continue;
    for (const value of card.supports) {
      const goal = goalSchema.safeParse(value);
      if (goal.success && goal.data !== 'other' && goals.includes(goal.data)) {
        result.push({ ingredientId: id, goal: goal.data });
      }
    }
  }
  return result;
}
