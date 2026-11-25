import type { ParsedIngredient } from '@/types';
import type { InciConfig } from '../config';
import { DEFAULT_INCI_CONFIG } from '../config';
import type { InciContent } from '../inci';
import { prepareComposition } from './composition';

// Editing the composition on the review screen. Every function returns a new list and
// numbers the positions again from 1, so the position is always the place in the list.

function renumber(items: readonly ParsedIngredient[]): ParsedIngredient[] {
  return items.map((item, index) => ({ ...item, position: index + 1 }));
}

/** The user confirms a "possible match": from now on it counts as a recognised position. */
export function confirmPosition(
  items: readonly ParsedIngredient[],
  position: number,
): ParsedIngredient[] {
  return items.map((item) =>
    item.position === position && item.matchType === 'fuzzy'
      ? { ...item, confirmed: true }
      : { ...item },
  );
}

export function removePosition(
  items: readonly ParsedIngredient[],
  position: number,
): ParsedIngredient[] {
  return renumber(items.filter((item) => item.position !== position));
}

/** The position is replaced by what the new text gives (it may be several positions, or none). */
export function replacePosition(
  items: readonly ParsedIngredient[],
  position: number,
  text: string,
  content: InciContent,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): ParsedIngredient[] {
  const fresh = prepareComposition(text, content, config).ingredients;
  if (fresh.length === 0) return items.map((item) => ({ ...item }));
  const result: ParsedIngredient[] = [];
  for (const item of items) {
    if (item.position === position) result.push(...fresh);
    else result.push(item);
  }
  return renumber(result);
}

/** Adds the positions of a text to the end. A name that is already in the list is not repeated. */
export function appendText(
  items: readonly ParsedIngredient[],
  text: string,
  content: InciContent,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): ParsedIngredient[] {
  const fresh = prepareComposition(text, content, config).ingredients.filter(
    (entry) =>
      entry.ingredientId === null ||
      !items.some((item) => item.ingredientId === entry.ingredientId),
  );
  return renumber([...items, ...fresh]);
}

/** The raw text of the composition, as the label order, for the product record. */
export function compositionText(items: readonly ParsedIngredient[]): string {
  return items.map((item) => item.raw).join(', ');
}
