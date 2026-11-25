import type { MatchedIngredient, Observation, ScanResult } from '@/types';
import { DEFAULT_INCI_CONFIG, type InciConfig } from '../config';
import { coverageOfComposition, resolveComposition } from './composition';
import { benefits } from './steps/benefits';
import { duplicateActives } from './steps/duplicateActives';
import { ingredientCautions } from './steps/ingredientCautions';
import { limitations } from './steps/limitations';
import { doctorNotes, personalRestrictions } from './steps/personalRestrictions';
import { preferenceMismatches } from './steps/preferences';
import { routineConflicts } from './steps/routineConflicts';
import { decideStatus } from './steps/status';
import { effectiveGoals } from '../profile/effectiveGoals';
import { isPossible, type AnalyzeInput, type Draft } from './types';

// The analysis of one product for one profile. A pure function: the id, the time and the
// whole context come as arguments, the result is the same every time.
//
// The order of the steps is the order of the plan (stage 8). Each step is its own function:
//   1. composition   resolveComposition, coverageOfComposition
//   2. restrictions  personalRestrictions (+ doctorNotes)
//   3. wishes        preferenceMismatches
//   4. cautions      ingredientCautions
//   5. conflicts     routineConflicts
//   6. duplicates    duplicateActives
//   7. benefits      benefits
//   8. fuzzy matches take part in steps 2-6 as "possible" and are never counted as confirmed
//   9. status        decideStatus (by priority)
//  10. limitations   limitations

function withIds(prefix: string, drafts: readonly Draft[]): Observation[] {
  return drafts.map((draft, index) => ({ ...draft, id: `${prefix}-${index + 1}` }));
}

export function analyzeProduct(
  input: AnalyzeInput,
  config: InciConfig = DEFAULT_INCI_CONFIG,
): ScanResult {
  const { id, product, profile, analysis, routines, products, content, now } = input;

  // 1. composition
  const composition = resolveComposition(product, content, config);
  const items = composition.ingredients;
  const coverage = coverageOfComposition(composition, config);

  // 2-7 (with 8 inside every step: the "possible" flag)
  const restrictions = personalRestrictions(items, profile, analysis, content);
  const notes = doctorNotes(analysis);
  const cautions = ingredientCautions(items, profile, content.ingredients);
  const conflicts = routineConflicts(product, items, routines, products, profile, content);
  const duplicates = duplicateActives(product, items, routines, products, content.ingredientGroups);
  const wishes = preferenceMismatches(items, analysis);
  const potential = benefits(items, effectiveGoals(profile.goals, analysis), content.ingredients);

  // the order the screen shows: restrictions first, wishes last
  const ordered: Draft[] = [
    ...restrictions,
    ...notes,
    ...cautions,
    ...conflicts,
    ...duplicates,
    ...wishes,
  ];

  // 9. status
  const status = decideStatus(ordered, items.length > 0, coverage);

  // 10. limitations
  const missing = limitations(product, items, coverage);

  const matched: MatchedIngredient[] = items
    .filter((item) => item.matchType !== 'unknown')
    .map((item) => ({
      raw: item.raw,
      position: item.position,
      ingredientId: item.ingredientId,
      groupIds: item.groupIds,
      matchType: item.matchType,
      confirmed: !isPossible(item),
    }));

  return {
    id,
    productSnapshot: { ...product, ingredients: items },
    checkedAt: new Date(now).toISOString(),
    status,
    matched,
    warnings: withIds(`${id}-w`, ordered),
    unknown: composition.unknown,
    insufficientInfo: withIds(`${id}-i`, missing),
    benefits: potential,
    coverage,
    profileRevision: profile.revision,
  };
}
