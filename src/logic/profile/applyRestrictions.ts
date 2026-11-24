import type { AvoidPref, ReactionGroup } from '@/types';
import type { Restrictions } from './types';

/**
 * A recommendation that stage 5 or later wants to offer.
 * `priority` is the priority of the rule that produced it (1 = strongest, see rules/).
 */
export type Candidate = {
  id: string;
  priority: number;
  /** Reaction groups the recommendation belongs to (for example "acids"). */
  reactionGroups: readonly ReactionGroup[];
  /** Preferences the recommendation goes against (for example "fragrance_essential_oils"). */
  avoidTags: readonly AvoidPref[];
};

// A known reaction is priority 2: it removes everything that is weaker than priority 2.
const REACTION_PRIORITY = 2;
// A personal wish only filters recommendations of goals and preferences (priority 6 and 7).
// The base care (priority 5 and stronger) is not removed by a wish.
const FIRST_FILTERED_BY_WISHES = 6;

/**
 * The rule "a restriction removes a recommendation of a lower priority":
 * oily skin with breakouts and a reaction to acids does not get an acid step,
 * even though the goal "reduce breakouts" would suggest one.
 */
export function applyRestrictions<T extends Candidate>(
  candidates: readonly T[],
  restrictions: Restrictions,
): T[] {
  return candidates.filter((candidate) => {
    const clashesWithReaction = candidate.reactionGroups.some((group) =>
      restrictions.reactions.includes(group),
    );
    if (clashesWithReaction && candidate.priority > REACTION_PRIORITY) return false;

    const clashesWithWish = candidate.avoidTags.some((tag) => restrictions.avoid.includes(tag));
    if (clashesWithWish && candidate.priority >= FIRST_FILTERED_BY_WISHES) return false;

    return true;
  });
}
