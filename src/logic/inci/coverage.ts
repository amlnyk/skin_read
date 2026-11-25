import { DEFAULT_INCI_CONFIG, type InciConfig } from '../config';
import type { Coverage, MatchedItem, UnknownItem } from './types';

// How much of the composition we understood. A fuzzy match that waits for a confirmation
// does not count as recognized, and an unknown position always counts against the ratio.
export function coverage(
  matched: readonly MatchedItem[],
  unknown: readonly UnknownItem[],
  config: InciConfig = DEFAULT_INCI_CONFIG,
): Coverage {
  const total = matched.length + unknown.length;
  const recognized = matched.filter((entry) => !entry.needsConfirmation).length;
  const unknownRatio = total === 0 ? 0 : (total - recognized) / total;
  return {
    total,
    recognized,
    unknownRatio,
    isSufficient: total >= config.minIngredients && unknownRatio <= config.maxUnknownRatio,
  };
}
