import type { ProductCategory, Routine, RoutineStep } from '@/types';

// Editing is done with buttons, without drag and drop: every function returns a new routine.

const renumber = (steps: RoutineStep[]): RoutineStep[] =>
  steps.map((step, order) => ({ ...step, order }));

/** Categories the user may add. "other" stays out: it names nothing to look for. */
export const ADDABLE_CATEGORIES: readonly ProductCategory[] = [
  'cleanser',
  'toner_essence',
  'serum',
  'exfoliant',
  'mask',
  'spot_treatment',
  'eye_cream',
  'moisturizer',
  'sunscreen',
];

/** Sunscreen belongs to the morning only. */
export function canAddCategory(slot: Routine['slot'], category: ProductCategory): boolean {
  return ADDABLE_CATEGORIES.includes(category) && !(category === 'sunscreen' && slot === 'pm');
}

export function moveStep(routine: Routine, stepId: string, direction: 'up' | 'down'): Routine {
  const index = routine.steps.findIndex((step) => step.id === stepId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= routine.steps.length) return routine;
  const steps = [...routine.steps];
  const moved = steps[index];
  const other = steps[target];
  if (!moved || !other) return routine;
  steps[index] = other;
  steps[target] = moved;
  return { ...routine, steps: renumber(steps) };
}

export function removeStep(routine: Routine, stepId: string): Routine {
  if (!routine.steps.some((step) => step.id === stepId)) return routine;
  return { ...routine, steps: renumber(routine.steps.filter((step) => step.id !== stepId)) };
}

/**
 * Adds the user's own step to the end of the list. The id comes from the caller (logic has no
 * random numbers). Returns the routine as it was when the category is not allowed in this slot.
 */
export function addStep(routine: Routine, id: string, category: ProductCategory): Routine {
  if (!canAddCategory(routine.slot, category)) return routine;
  const step: RoutineStep = {
    id,
    order: routine.steps.length,
    category,
    status: 'to_choose',
    // neutral until the user decides
    frequency: 'as_needed',
  };
  return { ...routine, steps: renumber([...routine.steps, step]) };
}
