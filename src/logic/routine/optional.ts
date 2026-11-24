import type { ContentBundle, Slot, SkinProfile } from '@/types';
import { applyRestrictions, effectiveGoals, type ProfileAnalysis } from '../profile';
import type { ChosenOptional, OptionalRejection, RejectedOptional } from './types';

// The goals have priority 6 in the rule order (see logic/profile/rules).
const GOAL_PRIORITY = 6;
const SLOT_ORDER: readonly Slot[] = ['am', 'pm'];

/**
 * Chooses the optional steps from the content candidates.
 *
 * An optional step is offered only in the "standard" mode, with no medical note, without an
 * anti-age step for a minor, without a clash with a reaction or a wish, and only for a goal
 * of the user. At most one optional step stands in a slot. With no verified candidate in
 * the content the result is empty: that is correct, nothing is invented.
 */
export function selectOptionalSteps(
  profile: Pick<SkinProfile, 'goals'>,
  analysis: ProfileAnalysis,
  content: Pick<ContentBundle, 'routineSteps'>,
): { chosen: ChosenOptional[]; rejected: RejectedOptional[] } {
  const goals = effectiveGoals(profile.goals, analysis);
  const rejected: RejectedOptional[] = [];
  const eligible: { info: ContentBundle['routineSteps'][number]; matched: number }[] = [];

  const candidates = content.routineSteps.filter((info) => info.kind === 'optional');
  for (const info of candidates) {
    const reject = (reason: OptionalRejection) => rejected.push({ info, reason });

    if (analysis.mode !== 'standard') {
      reject('mode');
    } else if (analysis.restrictions.medicalNotes.length > 0) {
      reject('medical');
    } else if (analysis.minorMode && info.antiAging) {
      reject('minor');
    } else if (
      applyRestrictions(
        [
          {
            id: info.id,
            priority: GOAL_PRIORITY,
            reactionGroups: info.reactionGroups,
            avoidTags: info.avoidTags,
          },
        ],
        analysis.restrictions,
      ).length === 0
    ) {
      reject('restriction');
    } else {
      const matched = info.goals.filter((goal) => goals.includes(goal)).length;
      if (matched === 0) reject('not_in_goals');
      else eligible.push({ info, matched });
    }
  }

  // More matched goals first; equal candidates keep the order of the content (stable sort).
  const ranked = [...eligible].sort((a, b) => b.matched - a.matched);
  const taken = new Set<Slot>();
  const chosen: ChosenOptional[] = [];
  for (const { info } of ranked) {
    const slot = SLOT_ORDER.find((s) => info.slots.includes(s) && !taken.has(s));
    if (slot === undefined) {
      rejected.push({ info, reason: 'slot_taken' });
    } else {
      taken.add(slot);
      chosen.push({ info, slot });
    }
  }
  return { chosen, rejected };
}
