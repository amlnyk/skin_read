import type { ContentBundle, RoutineStep, Slot } from '@/types';
import type { ProfileAnalysis } from '../profile';
import type { StepExplanation } from './types';
import { personalWarnings } from './warnings';

/**
 * What the screen shows about a step besides its place in the list: the content record with
 * the purpose, the components to look for and the personal warnings.
 * A user's own step has no content record of its own: the base record of its category is used,
 * and when there is none, `purposeId` is null ("Інформація готується").
 */
export function explainStep(
  step: Pick<RoutineStep, 'category' | 'contentId'>,
  slot: Slot,
  analysis: Pick<ProfileAnalysis, 'restrictions'>,
  content: Pick<ContentBundle, 'routineSteps'>,
): StepExplanation {
  const own = step.contentId
    ? content.routineSteps.find((info) => info.id === step.contentId)
    : undefined;
  const info =
    own ??
    content.routineSteps.find((item) => item.kind === 'base' && item.category === step.category);

  return {
    timeOfUse: slot,
    purposeId: info?.id ?? null,
    componentsToLookFor: info ? [...info.lookFor] : [],
    personalWarnings: personalWarnings(analysis),
  };
}
