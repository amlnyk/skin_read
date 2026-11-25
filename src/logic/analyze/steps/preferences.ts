import type { ParsedIngredient } from '@/types';
import type { ProfileAnalysis } from '../deps';
import { groupsForAvoid } from '../groupMap';
import type { Draft } from '../types';
import { newDraft } from '../types';
import { hitsInGroups } from './personalRestrictions';

// Step 3. Wishes ("I want to avoid ..."): a wish, not a confirmation that something is
// dangerous. The screen words it neutrally ("you asked to avoid ...").

export function preferenceMismatches(
  items: readonly ParsedIngredient[],
  analysis: Pick<ProfileAnalysis, 'restrictions'>,
): Draft[] {
  const drafts: Draft[] = [];
  for (const avoid of analysis.restrictions.avoid) {
    const hit = hitsInGroups(items, groupsForAvoid(avoid));
    if (!hit) continue;
    drafts.push(
      newDraft({
        kind: 'preference_mismatch',
        key: avoid,
        ingredientIds: hit.ids,
        groupIds: hit.groups,
        possible: hit.possible,
      }),
    );
  }
  return drafts;
}
