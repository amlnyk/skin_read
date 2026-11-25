import type { ParsedIngredient } from '@/types';
import { analyzeProduct, isRecognized } from '../analyze';
import type { CompareInput, CompareResult, PriceDifference, PriceInput, Similarity } from './types';

// Compares two products of the user. A pure function: the ids and the time come as arguments.
//
// It says what is the same and what differs in the COMPOSITION, nothing more. It never names an
// "alternative", a price or an availability of its own, and "similar" is never "equivalent":
// the concentrations, the formula and the pH are unknown (the screen says so next to the result).

/** The longest currency text we keep. */
export const MAX_CURRENCY_LENGTH = 8;

const unique = (values: readonly string[]): string[] => [...new Set(values)];

function recognized(items: readonly ParsedIngredient[]): ParsedIngredient[] {
  return items.filter(isRecognized);
}

function groupsOf(items: readonly ParsedIngredient[]): string[] {
  return unique(recognized(items).flatMap((item) => item.groupIds));
}

function ingredientsOf(items: readonly ParsedIngredient[]): string[] {
  return unique(
    recognized(items).flatMap((item) => (item.ingredientId ? [item.ingredientId] : [])),
  );
}

const price = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;

/**
 * The difference of two prices the user typed. Both prices and a currency are needed; a price of 0
 * counts as "not typed". Without them there is no difference at all (the field is absent).
 */
export function priceDifference(prices: PriceInput | undefined): PriceDifference | undefined {
  if (!prices || !price(prices.a) || !price(prices.b)) return undefined;
  const currency = (prices.currency ?? '').trim().slice(0, MAX_CURRENCY_LENGTH);
  if (currency === '') return undefined;
  const cents = Math.round(Math.abs(prices.a - prices.b) * 100);
  const cheaper = cents === 0 ? 'equal' : prices.a < prices.b ? 'a' : 'b';
  return { amount: cents / 100, currency, cheaper };
}

export function compareProducts(input: CompareInput): CompareResult {
  const { a, b, profile, analysis, routines, products, content, now } = input;
  const shared = { profile, analysis, routines, products, content, now };
  const resultA = analyzeProduct({ ...shared, id: input.idA, product: a });
  const resultB = analyzeProduct({ ...shared, id: input.idB, product: b });

  const itemsA = resultA.productSnapshot.ingredients;
  const itemsB = resultB.productSnapshot.ingredients;

  const groupsA = groupsOf(itemsA);
  const groupsB = groupsOf(itemsB);
  const sharedGroupIds = groupsA.filter((id) => groupsB.includes(id));
  const sharedActiveGroupIds = sharedGroupIds.filter(
    (id) => content.ingredientGroups.find((group) => group.id === id)?.active === true,
  );

  const ingredientsA = ingredientsOf(itemsA);
  const ingredientsB = ingredientsOf(itemsB);

  const sameCategory = a.category === b.category;

  // "insufficient" comes first: with a composition we cannot read, we cannot tell anything about
  // the function, not even from the categories.
  let similarity: Similarity;
  if (!resultA.coverage.isSufficient || !resultB.coverage.isSufficient)
    similarity = 'insufficient_info';
  else if (!sameCategory) similarity = 'different';
  else if (sharedActiveGroupIds.length > 0) similarity = 'likely_similar_function';
  else if (sharedGroupIds.length > 0) similarity = 'partially';
  else similarity = 'different';

  const difference = priceDifference(input.prices);

  return {
    sameCategory,
    sharedGroupIds,
    onlyAGroupIds: groupsA.filter((id) => !groupsB.includes(id)),
    onlyBGroupIds: groupsB.filter((id) => !groupsA.includes(id)),
    sharedActiveGroupIds,
    sharedIngredientIds: ingredientsA.filter((id) => ingredientsB.includes(id)),
    onlyAIngredientIds: ingredientsA.filter((id) => !ingredientsB.includes(id)),
    onlyBIngredientIds: ingredientsB.filter((id) => !ingredientsA.includes(id)),
    a: resultA,
    b: resultB,
    ...(difference ? { priceDifference: difference } : {}),
    similarity,
  };
}
