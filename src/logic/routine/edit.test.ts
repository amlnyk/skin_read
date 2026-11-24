import { describe, expect, it } from 'vitest';
import type { Routine } from '@/types';
import { addStep, canAddCategory, doneStepIds, markStep, moveStep, removeStep } from './index';

const routine = (slot: 'am' | 'pm' = 'am'): Routine => ({
  id: `routine-${slot}`,
  slot,
  steps: [
    { id: 'a', order: 0, category: 'cleanser', status: 'to_choose', frequency: 'daily' },
    { id: 'b', order: 1, category: 'moisturizer', status: 'owned', frequency: 'daily' },
    { id: 'c', order: 2, category: 'sunscreen', status: 'to_choose', frequency: 'daily' },
  ],
});
const ids = (r: Routine) => r.steps.map((step) => step.id);
const orders = (r: Routine) => r.steps.map((step) => step.order);

describe('moveStep', () => {
  it('moves a step down and up and keeps the order numbers in sequence', () => {
    const down = moveStep(routine(), 'a', 'down');
    expect(ids(down)).toEqual(['b', 'a', 'c']);
    expect(orders(down)).toEqual([0, 1, 2]);
    expect(ids(moveStep(down, 'a', 'up'))).toEqual(['a', 'b', 'c']);
  });

  it('does nothing at the edges and for an unknown step', () => {
    const base = routine();
    expect(moveStep(base, 'a', 'up')).toBe(base);
    expect(moveStep(base, 'c', 'down')).toBe(base);
    expect(moveStep(base, 'zzz', 'up')).toBe(base);
  });

  it('does not change the original', () => {
    const base = routine();
    moveStep(base, 'a', 'down');
    expect(ids(base)).toEqual(['a', 'b', 'c']);
  });
});

describe('removeStep', () => {
  it('removes a step and renumbers the rest', () => {
    const result = removeStep(routine(), 'b');
    expect(ids(result)).toEqual(['a', 'c']);
    expect(orders(result)).toEqual([0, 1]);
  });

  it('does nothing for an unknown step', () => {
    const base = routine();
    expect(removeStep(base, 'zzz')).toBe(base);
  });
});

describe('addStep', () => {
  it('adds the own step to the end, "to choose", with a neutral frequency', () => {
    const result = addStep(routine(), 'user-1', 'serum');
    expect(ids(result)).toEqual(['a', 'b', 'c', 'user-1']);
    expect(result.steps[3]).toEqual({
      id: 'user-1',
      order: 3,
      category: 'serum',
      status: 'to_choose',
      frequency: 'as_needed',
    });
  });

  it('sunscreen can be added in the morning only', () => {
    expect(canAddCategory('am', 'sunscreen')).toBe(true);
    expect(canAddCategory('pm', 'sunscreen')).toBe(false);
    const base = routine('pm');
    expect(addStep(base, 'user-1', 'sunscreen')).toBe(base);
  });

  it('"other" cannot be added', () => {
    expect(canAddCategory('am', 'other')).toBe(false);
  });
});

describe('done marks', () => {
  const logs = [
    { date: '2026-01-01', slot: 'am' as const, doneStepIds: ['a'] },
    { date: '2026-01-02', slot: 'am' as const, doneStepIds: ['b'] },
  ];

  it('reads the marks of one day and slot only', () => {
    expect(doneStepIds(logs, '2026-01-01', 'am')).toEqual(['a']);
    expect(doneStepIds(logs, '2026-01-01', 'pm')).toEqual([]);
    expect(doneStepIds(logs, '2026-01-03', 'am')).toEqual([]);
  });

  it('marks and unmarks a step without touching the others', () => {
    expect(markStep(logs, '2026-01-01', 'am', 'b', true)).toEqual({
      date: '2026-01-01',
      slot: 'am',
      doneStepIds: ['a', 'b'],
    });
    expect(markStep(logs, '2026-01-01', 'am', 'a', false).doneStepIds).toEqual([]);
  });

  it('marking twice does not repeat the id', () => {
    expect(markStep(logs, '2026-01-01', 'am', 'a', true).doneStepIds).toEqual(['a']);
  });

  it('starts a new entry for a new day', () => {
    expect(markStep(logs, '2026-01-03', 'pm', 'x', true)).toEqual({
      date: '2026-01-03',
      slot: 'pm',
      doneStepIds: ['x'],
    });
  });
});
