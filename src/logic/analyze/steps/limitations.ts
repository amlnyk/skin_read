import type { ParsedIngredient, Product } from '@/types';
import type { ProductCoverage } from '../composition';
import type { Draft } from '../types';
import { isPossible, newDraft } from '../types';

// Step 10. What the analysis could not know. These go to `insufficientInfo` and are shown on
// every result: the screen never lets a result look like a guarantee.
//
// Codes (the `key` of the observation, the screen writes the text):
//   no_composition         the product has no composition, so there was nothing to check;
//   low_coverage           too few positions or too many unknown ones for a reliable check;
//   unrecognized_items     some positions are not in the content (the count is `unknown.length` of the result);
//   possible_matches       some positions are only "possible matches" (the count is `unknown.length` of the result);
//   concentrations_unknown the composition says nothing about concentrations;
//   concentrations_declared the label states concentrations, which we do not verify;
//   no_guarantee           always: no check can promise there will be no reaction.

export type LimitationCode =
  | 'no_composition'
  | 'low_coverage'
  | 'unrecognized_items'
  | 'possible_matches'
  | 'concentrations_unknown'
  | 'concentrations_declared'
  | 'no_guarantee';

function limit(code: LimitationCode, extra: Partial<Draft> = {}): Draft {
  return newDraft({ kind: 'incomplete_data', key: code, ...extra });
}

export function limitations(
  product: Pick<Product, 'declaredConcentrations'>,
  items: readonly ParsedIngredient[],
  coverage: ProductCoverage,
): Draft[] {
  const drafts: Draft[] = [];
  if (items.length === 0) {
    drafts.push(limit('no_composition'));
  } else {
    if (!coverage.isSufficient) drafts.push(limit('low_coverage'));
    const unknown = items.filter((item) => item.matchType === 'unknown').length;
    if (unknown > 0) drafts.push(limit('unrecognized_items'));
    const possible = items.filter(isPossible).length;
    if (possible > 0) drafts.push(limit('possible_matches'));
    const declared = (product.declaredConcentrations ?? []).length > 0;
    drafts.push(limit(declared ? 'concentrations_declared' : 'concentrations_unknown'));
  }
  drafts.push(limit('no_guarantee'));
  return drafts;
}
