import type { AvoidPref, ReactionGroup } from '@/types';

// The questionnaire speaks in categories ("acids", "fragrance and essential oils"); the content
// speaks in ingredient groups. This table is the bridge between the two vocabularies.
//
// It is NOT cosmetology knowledge, only a naming agreement, and it has to be confirmed by the
// cosmetologist (see CONTENT_TODO.md, stage 8). A group id that is not in the content simply
// never matches, so a missing group means "no warning", never a wrong one.

const REACTION_GROUPS: Readonly<Record<ReactionGroup, readonly string[]>> = {
  acids: ['acids', 'aha', 'bha', 'pha'],
  retinoids: ['retinoids'],
  fragrance_essential_oils: ['fragrance', 'essential_oils'],
  preservatives_alcohol: ['preservatives', 'alcohol_denat'],
  // free text is handled by name (see steps/personalRestrictions), the rest means "nothing known"
  other: [],
  none_noticed: [],
  unknown: [],
};

const AVOID_GROUPS: Readonly<Record<AvoidPref, readonly string[]>> = {
  silicones: ['silicones'],
  sulfates: ['sulfates'],
  parabens: ['parabens'],
  fragrance_essential_oils: ['fragrance', 'essential_oils'],
  // fatty alcohols (cetyl, stearyl) are NOT drying alcohols: they are not in this list
  alcohol: ['alcohol_denat'],
  comedogenic_oils: ['comedogenic_oils'],
  none: [],
};

export function groupsForReaction(reaction: ReactionGroup): readonly string[] {
  return REACTION_GROUPS[reaction];
}

export function groupsForAvoid(avoid: AvoidPref): readonly string[] {
  return AVOID_GROUPS[avoid];
}
