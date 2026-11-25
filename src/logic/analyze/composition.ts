import type { DeclaredConcentration, ParsedIngredient, Product } from '@/types';
import type { InciConfig } from '../config';
import { DEFAULT_INCI_CONFIG } from '../config';
import {
  normalizeIngredients,
  parseInci,
  type InciContent,
  type MatchedItem,
  type ParseWarningCode,
  type UnknownItem,
} from '../inci';
import type { Composition } from './types';
import { isRecognized } from './types';

// Helpers for the composition of a product. The screens use them to prepare the review
// ("here is what we understood") before the product is saved or checked.

export type PreparedComposition = {
  /** The positions in the order of the label: matched ones, then the unknown ones in place. */
  ingredients: ParsedIngredient[];
  /** Unknown positions with the closest guesses (base ingredient ids), for the review screen. */
  suggestions: Record<string, string[]>;
  declaredConcentrations: DeclaredConcentration[];
  warnings: ParseWarningCode[];
};

function fromMatched(entry: MatchedItem): ParsedIngredient {
  return {
    raw: entry.item.raw.slice(0, 500),
    position: entry.item.position,
    ingredientId: entry.ingredientId,
    matchType: entry.matchType,
    groupIds: [...entry.groupIds],
    // only a fuzzy match waits for the user; every other tier is a fact of the content
    confirmed: !entry.needsConfirmation,
  };
}

function fromUnknown(entry: UnknownItem): ParsedIngredient {
  return {
    raw: entry.item.raw.slice(0, 500),
    position: entry.item.position,
    ingredientId: null,
    matchType: 'unknown',
    groupIds: [],
    confirmed: true,
  };
}

function percentOf(text: string): number | null {
  const plain = /^\s*(\d+(?:[.,]\d+)?)\s*%\s*$/u.exec(text);
  if (!plain?.[1]) return null;
  const value = Number(plain[1].replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

/** Parse + normalize a pasted text. Nothing is invented: what is not found stays unknown. */
export function prepareComposition(
  text: string,
  content: InciContent,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): PreparedComposition {
  const parsed = parseInci(text, config);
  const { matched, unknown } = normalizeIngredients(parsed.items, content, config);

  const ingredients = [...matched.map(fromMatched), ...unknown.map(fromUnknown)].sort(
    (a, b) => a.position - b.position,
  );

  const suggestions: Record<string, string[]> = {};
  for (const entry of unknown) {
    if (entry.suggestions.length > 0)
      suggestions[String(entry.item.position)] = [...entry.suggestions];
  }

  const declaredConcentrations = parsed.items
    .filter((item) => item.declaredConcentration !== null)
    .map((item) => ({
      raw: (item.declaredConcentration ?? '').slice(0, 500),
      percent: percentOf(item.declaredConcentration ?? ''),
    }));

  return { ingredients, suggestions, declaredConcentrations, warnings: parsed.warnings };
}

/** The product has no composition yet: it is saved as "needs a composition" and not analysed. */
export function needsComposition(product: Pick<Product, 'ingredients' | 'inciRaw'>): boolean {
  return product.ingredients.length === 0 && product.inciRaw.trim() === '';
}

/**
 * Step 1 of the analysis: the composition the analysis works with. The reviewed positions of
 * the product win; with none, the raw text is parsed now (a product saved by an older version).
 */
export function resolveComposition(
  product: Pick<Product, 'ingredients' | 'inciRaw'>,
  content: InciContent,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): Composition {
  const ingredients =
    product.ingredients.length > 0
      ? product.ingredients.map((item) => ({ ...item }))
      : product.inciRaw.trim() === ''
        ? []
        : prepareComposition(product.inciRaw, content, config).ingredients;
  return {
    ingredients,
    unknown: ingredients.filter((item) => item.matchType === 'unknown').map((item) => item.raw),
  };
}

export type ProductCoverage = {
  total: number;
  recognized: number;
  unknownRatio: number;
  isSufficient: boolean;
};

/** The coverage of reviewed positions. Fuzzy matches that wait for a confirmation do not count. */
export function coverageOfComposition(
  composition: Composition,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): ProductCoverage {
  const total = composition.ingredients.length;
  const recognized = composition.ingredients.filter(isRecognized).length;
  const unknownRatio = total === 0 ? 0 : (total - recognized) / total;
  return {
    total,
    recognized,
    unknownRatio,
    isSufficient: total >= config.minIngredients && unknownRatio <= config.maxUnknownRatio,
  };
}
