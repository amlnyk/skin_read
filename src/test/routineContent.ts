import type { ContentBundle, RoutineStepInfo } from '@/types';
import { profileContent } from './personas';

// Content fixtures for the routine tests. The texts are obviously test ones: the real content
// has no optional step candidates yet.

const META = { source: 'test fixture', reviewStatus: 'draft' as const };

export function stepInfo(partial: Partial<RoutineStepInfo> & { id: string }): RoutineStepInfo {
  return {
    ...META,
    kind: 'optional',
    category: 'serum',
    slots: ['pm'],
    title: `title ${partial.id}`,
    purpose: `purpose ${partial.id}`,
    frequency: 'one_two_per_week',
    lookFor: [],
    goals: [],
    reactionGroups: [],
    avoidTags: [],
    antiAging: false,
    ...partial,
  };
}

/** Texts for the three base steps (what the cosmetologist will provide). */
export const BASE_INFOS: RoutineStepInfo[] = (
  ['cleanser', 'moisturizer', 'sunscreen'] as const
).map((category) =>
  stepInfo({
    id: `step-base-${category}`,
    kind: 'base',
    category,
    slots: [],
    title: null,
    frequency: null,
    lookFor: category === 'cleanser' ? ['group-a'] : [],
  }),
);

/** An evening step for breakouts that goes against a reaction to acids. */
export const OPT_BREAKOUTS = stepInfo({
  id: 'opt-breakouts',
  category: 'serum',
  slots: ['pm'],
  goals: ['reduce_breakouts'],
  lookFor: ['group-a'],
});

/** An anti-age candidate: must never reach a user under 18. */
export const OPT_ANTI_AGE = stepInfo({
  id: 'opt-anti-age',
  category: 'serum',
  slots: ['pm'],
  goals: ['anti_aging'],
  antiAging: true,
});

/** A morning candidate for the goal "hydrate". */
export const OPT_HYDRATE_AM = stepInfo({
  id: 'opt-hydrate',
  category: 'toner_essence',
  slots: ['am'],
  goals: ['hydrate'],
});

/** An evening candidate that clashes with a reaction to acids. */
export const OPT_ACID = stepInfo({
  id: 'opt-acid',
  category: 'exfoliant',
  slots: ['pm'],
  goals: ['reduce_breakouts'],
  reactionGroups: ['acids'],
});

/** The profile fixture content plus routine steps. */
export function routineContent(routineSteps: RoutineStepInfo[]): ContentBundle {
  return { ...profileContent(), routineSteps };
}
