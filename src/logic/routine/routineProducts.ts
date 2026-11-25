import type { Product, ProductCategory, Routine, Slot } from '@/types';

// What the routine holds, as the analysis needs it: the products that stand in it (and in which
// slots) and which categories are covered. Steps that point to a product that is not in the
// collection are ignored, as in the product check.

export type RoutineEntry = { product: Product; slots: Slot[] };

const SLOT_ORDER: readonly Slot[] = ['am', 'pm'];

export const bySlotOrder = (slots: Iterable<Slot>): Slot[] => {
  const set = new Set(slots);
  return SLOT_ORDER.filter((slot) => set.has(slot));
};

/** The products of the routine, each once, in the order of the routine (morning first). */
export function routineProducts(
  routines: readonly Routine[],
  products: readonly Product[],
): RoutineEntry[] {
  const entries = new Map<string, { product: Product; slots: Set<Slot> }>();
  const ordered = [...routines].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );
  for (const routine of ordered) {
    for (const step of routine.steps) {
      if (step.productId === undefined) continue;
      const product = products.find((entry) => entry.id === step.productId);
      if (!product) continue;
      const known = entries.get(product.id);
      if (known) known.slots.add(routine.slot);
      else entries.set(product.id, { product, slots: new Set([routine.slot]) });
    }
  }
  return [...entries.values()].map((entry) => ({
    product: entry.product,
    slots: bySlotOrder(entry.slots),
  }));
}

/**
 * The categories the user has in a slot: a step with a product from the collection, or a step the
 * user marked as "owned" without adding the product (they said they have it; we do not know what).
 */
export function categoriesInSlots(
  routines: readonly Routine[],
  products: readonly Product[],
): Record<Slot, ReadonlySet<ProductCategory>> {
  const result: Record<Slot, Set<ProductCategory>> = { am: new Set(), pm: new Set() };
  for (const routine of routines) {
    for (const step of routine.steps) {
      const hasProduct =
        step.productId !== undefined && products.some((product) => product.id === step.productId);
      const ownedWithoutProduct = step.productId === undefined && step.status === 'owned';
      if (hasProduct || ownedWithoutProduct) result[routine.slot].add(step.category);
    }
  }
  return result;
}
