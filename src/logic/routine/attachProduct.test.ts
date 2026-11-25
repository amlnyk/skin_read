import { describe, expect, it } from 'vitest';
import type { Routine } from '@/types';
import { attachProduct, canAttach } from './attachProduct';

const routine = (slot: 'am' | 'pm', steps: Routine['steps']): Routine => ({
  id: `r-${slot}`,
  slot,
  steps,
});
const step = (id: string, category: Routine['steps'][number]['category'], extra = {}) => ({
  id,
  order: 0,
  category,
  status: 'to_choose' as const,
  frequency: 'daily' as const,
  ...extra,
});

describe('attachProduct', () => {
  const cleanser = { id: 'p1', category: 'cleanser' as const };

  it('takes the free step of its category', () => {
    const before = routine('am', [step('a', 'cleanser'), step('b', 'moisturizer')]);
    const after = attachProduct(before, cleanser, 'new', 'every_other_day');
    expect(after.steps).toHaveLength(2);
    expect(after.steps[0]).toMatchObject({
      productId: 'p1',
      status: 'owned',
      frequency: 'every_other_day',
    });
    expect(before.steps[0]?.productId).toBeUndefined();
  });

  it('is added at the end when there is no free step', () => {
    const before = routine('pm', [step('a', 'cleanser', { productId: 'p9', status: 'owned' })]);
    const after = attachProduct(before, cleanser, 'new', 'daily');
    expect(after.steps.map((entry) => entry.id)).toEqual(['a', 'new']);
    expect(after.steps[1]).toMatchObject({ order: 1, productId: 'p1', status: 'owned' });
  });

  it('is not added twice, and sunscreen is not added to the evening', () => {
    const once = attachProduct(routine('am', []), cleanser, 'x', 'daily');
    expect(canAttach(once, cleanser)).toBe(false);
    expect(attachProduct(once, cleanser, 'y', 'daily')).toBe(once);
    const sunscreen = { id: 'p2', category: 'sunscreen' as const };
    expect(canAttach(routine('pm', []), sunscreen)).toBe(false);
    expect(canAttach(routine('am', []), sunscreen)).toBe(true);
  });
});
