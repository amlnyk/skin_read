import type {
  ContentBundle,
  Frequency,
  ProductCategory,
  Routine,
  RoutineStep,
  SkinProfile,
  Slot,
} from '@/types';
import type { ProfileAnalysis } from '../profile';
import { selectOptionalSteps } from './optional';
import type { BuiltRoutine, RoutineNote } from './types';

type BaseStep = { category: ProductCategory; frequency: Frequency };

// The base routine from the spec: the morning cleanser is "if needed", sunscreen is always
// in the morning, toners, essences and serums are never required.
const BASE_STEPS: Record<Slot, readonly BaseStep[]> = {
  am: [
    { category: 'cleanser', frequency: 'as_needed' },
    { category: 'moisturizer', frequency: 'daily' },
    { category: 'sunscreen', frequency: 'daily' },
  ],
  pm: [
    { category: 'cleanser', frequency: 'daily' },
    { category: 'moisturizer', frequency: 'daily' },
  ],
};

export const BASE_CATEGORIES: readonly ProductCategory[] = ['cleanser', 'moisturizer', 'sunscreen'];

export const ROUTINE_IDS: Record<Slot, string> = { am: 'routine-am', pm: 'routine-pm' };

/** Step ids are made from the slot and the category, so a rebuild keeps the "done today" marks. */
export const baseStepId = (slot: Slot, category: ProductCategory) => `${slot}-${category}`;
export const optionalStepId = (slot: Slot, contentId: string) => `${slot}-opt-${contentId}`;

/**
 * Builds the morning and the evening routine from the profile. No language model, no clock:
 * the same arguments always give the same result.
 *
 * `ownedCategories` are the categories the user already has; their steps get the status "owned".
 */
export function buildBaseRoutine(
  profile: Pick<SkinProfile, 'goals'>,
  analysis: ProfileAnalysis,
  ownedCategories: readonly ProductCategory[],
  content: Pick<ContentBundle, 'routineSteps'>,
): BuiltRoutine {
  const { chosen } = selectOptionalSteps(profile, analysis, content);

  const routines = (['am', 'pm'] as const).map((slot): Routine => {
    const steps: RoutineStep[] = BASE_STEPS[slot].map((base) => ({
      id: baseStepId(slot, base.category),
      order: 0,
      category: base.category,
      status: ownedCategories.includes(base.category) ? 'owned' : 'to_choose',
      frequency: base.frequency,
    }));

    for (const { info, slot: optionalSlot } of chosen) {
      if (optionalSlot !== slot) continue;
      const optional: RoutineStep = {
        id: optionalStepId(slot, info.id),
        order: 0,
        category: info.category,
        contentId: info.id,
        status: 'optional',
        // a neutral value while the content has no frequency for the step
        frequency: info.frequency ?? 'as_needed',
      };
      // Sunscreen stays the last step of the morning; in the evening the extra step goes to the end.
      const last = steps[steps.length - 1];
      if (slot === 'am' && last?.category === 'sunscreen')
        steps.splice(steps.length - 1, 0, optional);
      else steps.push(optional);
    }

    return {
      id: ROUTINE_IDS[slot],
      slot,
      steps: steps.map((step, order) => ({ ...step, order })),
    };
  });

  const notes: RoutineNote[] = [];
  const medical = analysis.restrictions.medicalNotes;
  if (medical.includes('prescribed_derm_treatment')) notes.push('follow_doctor_scheme');
  if (analysis.mode !== 'standard' || medical.length > 0) notes.push('no_extra_steps');

  return { routines, notes };
}
