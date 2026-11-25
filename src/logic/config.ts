// Thresholds of the composition analysis. These are not medical rules: they are tuning values
// with defaults, so they live in one place and tests can pass their own.

export const MIN_INGREDIENTS = 5;
export const MAX_UNKNOWN_RATIO = 0.4;
/** A composition longer than this gets the warning "too_long". */
export const MAX_PARSED_ITEMS = 300;

/** Words shorter than this are never searched with fuzzy matching ("aqua" must not become "aloe"). */
export const FUZZY_MIN_LENGTH = 5;
/** Words of FUZZY_MIN_LENGTH up to FUZZY_LONG_FROM - 1 characters may differ by this many characters. */
export const FUZZY_SHORT_DISTANCE = 1;
export const FUZZY_LONG_FROM = 9;
export const FUZZY_LONG_DISTANCE = 2;
/** How many suggestions an unknown item carries. */
export const MAX_SUGGESTIONS = 3;

export type InciConfig = {
  minIngredients: number;
  maxUnknownRatio: number;
  maxParsedItems: number;
  fuzzyMinLength: number;
  fuzzyShortDistance: number;
  fuzzyLongFrom: number;
  fuzzyLongDistance: number;
  maxSuggestions: number;
};

export const DEFAULT_INCI_CONFIG: InciConfig = {
  minIngredients: MIN_INGREDIENTS,
  maxUnknownRatio: MAX_UNKNOWN_RATIO,
  maxParsedItems: MAX_PARSED_ITEMS,
  fuzzyMinLength: FUZZY_MIN_LENGTH,
  fuzzyShortDistance: FUZZY_SHORT_DISTANCE,
  fuzzyLongFrom: FUZZY_LONG_FROM,
  fuzzyLongDistance: FUZZY_LONG_DISTANCE,
  maxSuggestions: MAX_SUGGESTIONS,
};

/** The largest edit distance accepted for a word of this length; 0 means "do not search". */
export function fuzzyDistanceFor(length: number, config: InciConfig = DEFAULT_INCI_CONFIG): number {
  if (length < config.fuzzyMinLength) return 0;
  return length >= config.fuzzyLongFrom ? config.fuzzyLongDistance : config.fuzzyShortDistance;
}

// Thresholds of the analysis of the whole routine (stage 9). Like the ones above these are
// tuning values, not medical rules: the observation says "may raise the risk", never "is harmful".

/** From this many "active" products in one slot the routine gets "many_actives_in_slot". */
export const MANY_ACTIVES_IN_SLOT = 2;

export type RoutineConfig = {
  manyActivesInSlot: number;
};

export const DEFAULT_ROUTINE_CONFIG: RoutineConfig = {
  manyActivesInSlot: MANY_ACTIVES_IN_SLOT,
};
