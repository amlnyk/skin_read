import type { Frequency, Product, Routine, RoutineStep } from '@/types';

// "Add to the routine": the product takes the free step of its category when there is one
// (a step the user still had to choose), otherwise it is added at the end. Sunscreen belongs
// to the morning only, so it is not added to the evening. A product that is already in the
// slot is not added twice.

export function canAttach(routine: Routine, product: Pick<Product, 'id' | 'category'>): boolean {
  if (product.category === 'sunscreen' && routine.slot === 'pm') return false;
  return !routine.steps.some((step) => step.productId === product.id);
}

export function attachProduct(
  routine: Routine,
  product: Pick<Product, 'id' | 'category'>,
  stepId: string,
  frequency: Frequency,
): Routine {
  if (!canAttach(routine, product)) return routine;

  const free = routine.steps.find(
    (step) =>
      step.category === product.category && step.productId === undefined && step.status !== 'owned',
  );
  if (free) {
    return {
      ...routine,
      steps: routine.steps.map((step) =>
        step.id === free.id
          ? { ...step, productId: product.id, status: 'owned' as const, frequency }
          : step,
      ),
    };
  }
  const step: RoutineStep = {
    id: stepId,
    order: routine.steps.length,
    category: product.category,
    productId: product.id,
    status: 'owned',
    frequency,
  };
  return { ...routine, steps: [...routine.steps, step] };
}
