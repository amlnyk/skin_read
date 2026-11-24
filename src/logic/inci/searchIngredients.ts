import type { Ingredient, IngredientGroup } from '@/schemas';
import { normalizeText } from './normalizeText';

// Search in the reference. Pure: the content comes as an argument.
// A query matches the Ukrainian name, the INCI name and the aliases (Ukrainian and English).
// Order: exact name, then names that start with the query, then words that start with it,
// then any occurrence, then "every word of the query is somewhere". Equal scores keep the
// order of the content file.

// The functions take only the lists they need, read-only (the callers may hold readonly arrays).
type WithIngredients = { readonly ingredients: readonly Ingredient[] };
type WithGroups = { readonly ingredientGroups: readonly IngredientGroup[] };

export type SearchOptions = {
  /** Keep only ingredients of this category (exact text of `category`). */
  category?: string | null;
};

// Lower number = better match.
const EXACT = 0;
const PREFIX = 1;
const WORD_PREFIX = 2;
const CONTAINS = 3;
const ALL_WORDS = 4;
const NO_MATCH = Number.POSITIVE_INFINITY;

function scoreField(field: string, query: string): number {
  if (field === query) return EXACT;
  if (field.startsWith(query)) return PREFIX;
  if (field.split(' ').some((word) => word.startsWith(query))) return WORD_PREFIX;
  if (field.includes(query)) return CONTAINS;
  return NO_MATCH;
}

function score(fields: readonly string[], query: string, words: readonly string[]): number {
  let best = NO_MATCH;
  for (const field of fields) best = Math.min(best, scoreField(field, query));
  if (best !== NO_MATCH) return best;
  if (words.length > 1) {
    const joined = fields.join(' ');
    if (words.every((word) => joined.includes(word))) return ALL_WORDS;
  }
  return NO_MATCH;
}

function rank<T>(
  items: readonly T[],
  query: string,
  fieldsOf: (item: T) => readonly (string | null)[],
): T[] {
  const normalized = normalizeText(query);
  // an empty query is "show everything", in the order of the content
  if (normalized === '') return [...items];
  const words = normalized.split(' ');
  return items
    .map((item, index) => {
      const fields = fieldsOf(item)
        .filter((field): field is string => field !== null)
        .map(normalizeText)
        .filter((field) => field !== '');
      return { item, index, score: score(fields, normalized, words) };
    })
    .filter((entry) => entry.score !== NO_MATCH)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.item);
}

export function searchIngredients(
  query: string,
  content: WithIngredients,
  options: SearchOptions = {},
): Ingredient[] {
  const category = options.category ?? null;
  const pool =
    category === null
      ? content.ingredients
      : content.ingredients.filter((ingredient) => ingredient.category === category);
  return rank(pool, query, (ingredient) => [
    ingredient.nameUk,
    ingredient.inci,
    ...ingredient.aliases,
  ]);
}

export function searchGroups(query: string, content: WithGroups): IngredientGroup[] {
  return rank(content.ingredientGroups, query, (group) => [group.nameUk]);
}

/** The ingredients that belong to a group, in the order of the content. */
export function ingredientsOfGroup(groupId: string, content: WithIngredients): Ingredient[] {
  return content.ingredients.filter((ingredient) => ingredient.groups.includes(groupId));
}

/** Ingredients that are in no (visible) group. */
export function ungroupedIngredients(content: WithIngredients & WithGroups): Ingredient[] {
  const known = new Set(content.ingredientGroups.map((group) => group.id));
  return content.ingredients.filter(
    (ingredient) => !ingredient.groups.some((group) => known.has(group)),
  );
}

/** The distinct categories of the ingredients, sorted, without empty ones. */
export function categoriesOf(content: WithIngredients): string[] {
  const unique = new Set<string>();
  for (const ingredient of content.ingredients) {
    if (ingredient.category !== null && ingredient.category.trim() !== '') {
      unique.add(ingredient.category);
    }
  }
  return [...unique].sort((a, b) => a.localeCompare(b, 'uk'));
}
