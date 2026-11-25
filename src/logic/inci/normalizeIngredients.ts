import type { Ingredient, IngredientGroup } from '@/schemas';
import { DEFAULT_INCI_CONFIG, fuzzyDistanceFor, type InciConfig } from '../config';
import { levenshtein } from './levenshtein';
import { normalizeText } from './normalizeText';
import type { MatchedItem, NormalizeResult, ParsedItem, UnknownItem } from './types';

// Matches parsed positions against the reference content. Pure: the content is an argument.
//
// The order of the tiers is fixed, and a higher tier always wins over a lower one:
//   1. exact:         the name is the INCI name of an ingredient;
//   2. alias:         the name is a Ukrainian name or a synonym;
//   3. group_pattern: the name fits a lexical pattern of a group ("*sulfate", "parfum");
//   4. fuzzy:         one edit-distance neighbour (a typo). Never counts without a confirmation.
// Every tier looks at all the names of a position (the whole name, the main one, the
// alternatives), so "Aqua (Water)" is found by either.

export type InciContent = {
  readonly ingredients: readonly Ingredient[];
  readonly ingredientGroups: readonly IngredientGroup[];
};

type NamedIngredient = { ingredient: Ingredient; name: string };

type CompiledPattern = {
  groupId: string;
  mode: 'equals' | 'startsWith' | 'endsWith' | 'contains';
  core: string;
};

/** The pattern grammar: "*x" ends with x, "x*" starts with x, "*x*" contains x, "x" is the whole name. */
export function compilePattern(groupId: string, pattern: string): CompiledPattern | null {
  const trimmed = pattern.trim();
  const starts = trimmed.startsWith('*');
  const ends = trimmed.length > 1 && trimmed.endsWith('*');
  const core = normalizeText(trimmed.replace(/^\*+|\*+$/gu, ''));
  if (core === '') return null;
  const mode = starts && ends ? 'contains' : starts ? 'endsWith' : ends ? 'startsWith' : 'equals';
  return { groupId, mode, core };
}

function fits(pattern: CompiledPattern, name: string): boolean {
  switch (pattern.mode) {
    case 'equals':
      return name === pattern.core;
    case 'startsWith':
      return name.startsWith(pattern.core);
    case 'endsWith':
      return name.endsWith(pattern.core);
    case 'contains':
      return name.includes(pattern.core);
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function candidateNames(item: ParsedItem): string[] {
  return unique([item.fullName, item.name, ...item.altNames].filter((name) => name !== ''));
}

type Index = {
  exact: Map<string, Ingredient>;
  alias: Map<string, Ingredient>;
  patterns: CompiledPattern[];
  fuzzyNames: NamedIngredient[];
};

function buildIndex(content: InciContent): Index {
  const exact = new Map<string, Ingredient>();
  const alias = new Map<string, Ingredient>();
  const fuzzyNames: NamedIngredient[] = [];
  for (const ingredient of content.ingredients) {
    const inci = normalizeText(ingredient.inci);
    if (inci !== '' && !exact.has(inci)) exact.set(inci, ingredient);
    if (inci !== '') fuzzyNames.push({ ingredient, name: inci });
    const others = [ingredient.nameUk ?? '', ...ingredient.aliases].map(normalizeText);
    for (const name of others) {
      if (name === '') continue;
      if (!alias.has(name)) alias.set(name, ingredient);
      fuzzyNames.push({ ingredient, name });
    }
  }
  const patterns: CompiledPattern[] = [];
  for (const group of content.ingredientGroups) {
    for (const pattern of group.patterns) {
      const compiled = compilePattern(group.id, pattern);
      if (compiled) patterns.push(compiled);
    }
  }
  return { exact, alias, patterns, fuzzyNames };
}

function patternGroups(index: Index, names: readonly string[]): string[] {
  const ids: string[] = [];
  for (const pattern of index.patterns) {
    if (names.some((name) => fits(pattern, name))) ids.push(pattern.groupId);
  }
  return unique(ids);
}

function fuzzyMatch(
  index: Index,
  names: readonly string[],
  config: InciConfig,
): {
  matched: { ingredient: Ingredient; name: string; distance: number } | null;
  suggestions: string[];
} {
  // the best distance per ingredient, over all names of the position
  const best = new Map<string, { ingredient: Ingredient; name: string; distance: number }>();
  for (const name of names) {
    const limit = fuzzyDistanceFor(name.length, config);
    if (limit === 0) continue;
    for (const candidate of index.fuzzyNames) {
      const distance = levenshtein(name, candidate.name, limit);
      if (distance === 0 || distance > limit) continue;
      const known = best.get(candidate.ingredient.id);
      if (!known || distance < known.distance) {
        best.set(candidate.ingredient.id, { ingredient: candidate.ingredient, name, distance });
      }
    }
  }
  const ranked = [...best.values()].sort((x, y) => x.distance - y.distance);
  const first = ranked[0];
  if (!first) return { matched: null, suggestions: [] };
  const tied = ranked.filter((entry) => entry.distance === first.distance);
  if (tied.length === 1) return { matched: first, suggestions: [] };
  return {
    matched: null,
    suggestions: ranked.slice(0, config.maxSuggestions).map((entry) => entry.ingredient.id),
  };
}

function ingredientMatch(
  item: ParsedItem,
  matchType: 'exact' | 'alias' | 'fuzzy',
  ingredient: Ingredient,
  matchedName: string,
  index: Index,
  names: readonly string[],
  distance: number,
): MatchedItem {
  return {
    item,
    matchType,
    ingredientId: ingredient.id,
    groupIds: unique([...ingredient.groups, ...patternGroups(index, names)]),
    matchedName,
    needsConfirmation: matchType === 'fuzzy',
    distance,
  };
}

function matchOne(item: ParsedItem, index: Index, config: InciConfig): MatchedItem | UnknownItem {
  const names = candidateNames(item);

  for (const name of names) {
    const found = index.exact.get(name);
    if (found) return ingredientMatch(item, 'exact', found, name, index, names, 0);
  }
  for (const name of names) {
    const found = index.alias.get(name);
    if (found) return ingredientMatch(item, 'alias', found, name, index, names, 0);
  }

  const groupIds = patternGroups(index, names);
  if (groupIds.length > 0) {
    const matchedName =
      names.find((name) => index.patterns.some((pattern) => fits(pattern, name))) ?? item.name;
    return {
      item,
      matchType: 'group_pattern',
      ingredientId: null,
      groupIds,
      matchedName,
      needsConfirmation: false,
      distance: 0,
    };
  }

  const fuzzy = fuzzyMatch(index, names, config);
  if (fuzzy.matched) {
    return ingredientMatch(
      item,
      'fuzzy',
      fuzzy.matched.ingredient,
      fuzzy.matched.name,
      index,
      names,
      fuzzy.matched.distance,
    );
  }
  return { item, suggestions: fuzzy.suggestions };
}

function isMatched(result: MatchedItem | UnknownItem): result is MatchedItem {
  return 'matchType' in result;
}

export function normalizeIngredients(
  items: readonly ParsedItem[],
  content: InciContent,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): NormalizeResult {
  const index = buildIndex(content);
  const matched: MatchedItem[] = [];
  const unknown: UnknownItem[] = [];
  for (const item of items) {
    const result = matchOne(item, index, config);
    if (isMatched(result)) matched.push(result);
    else unknown.push(result);
  }
  return { matched, unknown };
}
