import type { Ingredient, IngredientGroup } from '@/types';

// Names for the screens. The content may have no Ukrainian name yet: the INCI name is the
// fallback for an ingredient, and a group with no name gives null (the screen says
// "Інформація готується").

const filled = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== '';

export function ingredientName(id: string, ingredients: readonly Ingredient[]): string {
  const card = ingredients.find((entry) => entry.id === id);
  if (!card) return id;
  return filled(card.nameUk) ? card.nameUk : card.inci;
}

export function groupName(id: string, groups: readonly IngredientGroup[]): string | null {
  const group = groups.find((entry) => entry.id === id);
  return filled(group?.nameUk) ? group.nameUk : null;
}
