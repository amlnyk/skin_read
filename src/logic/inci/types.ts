import type { MatchType } from '@/schemas';

// ---- Parsing ----

export type ParseWarningCode = 'multiple_lists_detected' | 'too_long';

/** One position of the composition. */
export type ParsedItem = {
  /** 1-based position in the list. */
  position: number;
  /** The text of the position as written (brackets and concentration kept; footnote marks removed). */
  raw: string;
  /** The main name, normalized (see normalizeText). */
  name: string;
  /** Other names of the same ingredient: "Aqua (Water)", "Aqua/Water". Normalized. */
  altNames: string[];
  /** The whole name without brackets and concentration, normalized. Equals `name` for simple items. */
  fullName: string;
  /** The concentration as the label says it ("5%"). Not a checked value. */
  declaredConcentration: string | null;
};

export type ParseResult = {
  items: ParsedItem[];
  warnings: ParseWarningCode[];
};

// ---- Matching ----

export type MatchedItem = {
  item: ParsedItem;
  matchType: Exclude<MatchType, 'unknown'>;
  /** The base ingredient. null only for a "group_pattern" match (the name is known only by its group). */
  ingredientId: string | null;
  /** The groups of the ingredient plus the groups whose patterns the name fits. */
  groupIds: string[];
  /** Which normalized name matched. */
  matchedName: string;
  /** true for "fuzzy": the user has to confirm it before it counts. */
  needsConfirmation: boolean;
  /** The edit distance of a "fuzzy" match, 0 otherwise. */
  distance: number;
};

export type UnknownItem = {
  item: ParsedItem;
  /** Base ingredient ids that were close but could not be chosen (a tie), best first. */
  suggestions: string[];
};

export type NormalizeResult = {
  matched: MatchedItem[];
  unknown: UnknownItem[];
};

export type Coverage = {
  total: number;
  /** Matched and not waiting for a confirmation. */
  recognized: number;
  unknownRatio: number;
  isSufficient: boolean;
};
