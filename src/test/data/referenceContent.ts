import type { ContentBundle, Ingredient, IngredientGroup } from '@/schemas';

// Invented records for tests of the reference (never shown in the real app).
// The real content has no ingredient records yet: the cosmetologist has not given any.

const TEST_SOURCE = 'test fixture';

export function group(
  id: string,
  nameUk: string,
  overrides: Partial<IngredientGroup> = {},
): IngredientGroup {
  return {
    id,
    source: TEST_SOURCE,
    reviewStatus: 'draft',
    nameUk,
    description: null,
    patterns: [],
    ...overrides,
  };
}

export function ingredient(
  id: string,
  inci: string,
  overrides: Partial<Ingredient> = {},
): Ingredient {
  return {
    id,
    source: TEST_SOURCE,
    reviewStatus: 'draft',
    inci,
    nameUk: null,
    aliases: [],
    groups: [],
    category: null,
    purpose: null,
    properties: [],
    cautions: [],
    usage: null,
    knownInteractions: [],
    supports: [],
    ...overrides,
  };
}

export const GROUP_NIACINAMIDE = group('niacinamide', 'Ніацинамід');
export const GROUP_ALCOHOL = group('alcohol_denat', 'Денатурований спирт');
export const GROUP_FATTY = group('fatty_alcohols', 'Жирні спирти');

export const NIACINAMIDE = ingredient('i-niacinamide', 'Niacinamide', {
  nameUk: 'Ніацинамід',
  aliases: ['Нікотинамід', 'Vitamin B3'],
  groups: ['niacinamide'],
  category: 'Активний компонент',
  purpose: 'Тестове пояснення призначення.',
  properties: ['тестова властивість'],
  cautions: [{ conditions: [], text: 'Тестове застереження.' }],
  usage: 'Тестова особливість застосування.',
  knownInteractions: ['i-sd-alcohol'],
  supports: ['barrier'],
});
export const SD_ALCOHOL = ingredient('i-sd-alcohol', 'Alcohol Denat.', {
  nameUk: 'Спирт денатурований',
  groups: ['alcohol_denat'],
  category: 'Розчинник',
});
export const CETEARYL = ingredient('i-cetearyl', 'Cetearyl Alcohol', {
  nameUk: 'Цетеариловий спирт',
  groups: ['fatty_alcohols'],
  category: 'Емолент',
});
export const APOSTROPHE = ingredient('i-apostrophe', 'Test Extract', {
  nameUk: "Пом'якшувальний екстракт",
});
export const PLACEHOLDER_LIKE = ingredient('i-pending', 'Pending Ingredient');

export const REFERENCE_INGREDIENTS = [
  NIACINAMIDE,
  SD_ALCOHOL,
  CETEARYL,
  APOSTROPHE,
  PLACEHOLDER_LIKE,
];
export const REFERENCE_GROUPS = [GROUP_NIACINAMIDE, GROUP_ALCOHOL, GROUP_FATTY];

export function referenceBundle(base: ContentBundle): ContentBundle {
  return {
    ...base,
    ingredientGroups: REFERENCE_GROUPS,
    ingredients: REFERENCE_INGREDIENTS,
  };
}
