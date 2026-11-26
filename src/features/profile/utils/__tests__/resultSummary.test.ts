import { describe, expect, it } from 'vitest';
import type { SkinRecommendation } from '@/schemas';
import {
  avoidChips,
  lookForChips,
  pluralForm,
  recommendationsFor,
  splitTypeName,
} from '../resultSummary';

const rec = (
  id: string,
  target: SkinRecommendation['target'],
  lookFor: SkinRecommendation['lookFor'],
  avoid: string[] = [],
): SkinRecommendation => ({
  id,
  source: 'test',
  reviewStatus: 'draft',
  target,
  title: null,
  text: null,
  lookFor,
  avoid,
});

const oily = rec('oily', { baseTypes: ['oily'], conditions: [] }, [
  { label: 'A', reactionGroup: null },
  { label: 'Acid', reactionGroup: 'acids' },
]);
const aging = rec(
  'aging',
  { baseTypes: [], conditions: ['aging_signs'] },
  [
    { label: 'a', reactionGroup: null },
    { label: 'Retinoid', reactionGroup: 'retinoids' },
  ],
  ['X'],
);

describe('result summary', () => {
  it('splits the type name for the big title', () => {
    expect(splitTypeName('Жирна або схильна до жирності')).toEqual([
      'Жирна',
      'або схильна до жирності',
    ]);
    expect(splitTypeName('Нормальна / резистентна')).toEqual(['Нормальна', 'резистентна']);
    expect(splitTypeName('Не впевнена')).toEqual(['Не впевнена', null]);
  });

  it('picks the recommendations of the type and the conditions', () => {
    const blocks = [
      { kind: 'skin_type' as const, key: 'oily' as const, contentId: 'x' },
      { kind: 'condition' as const, key: 'aging_signs' as const, contentId: 'y' },
    ];
    expect(recommendationsFor(blocks, [aging, oily]).map((item) => item.id)).toEqual([
      'oily',
      'aging',
    ]);
  });

  it('leaves out chips of a reaction group and retinoids for minors, without repeats', () => {
    expect(lookForChips([oily, aging], [], false)).toEqual(['A', 'Acid', 'Retinoid']);
    expect(lookForChips([oily, aging], ['acids'], true)).toEqual(['A']);
  });

  it('puts the person restrictions first in "avoid"', () => {
    expect(avoidChips(['Mine', 'x'], [aging])).toEqual(['Mine', 'x']);
  });

  it('chooses the Ukrainian plural form', () => {
    expect([1, 2, 4, 5, 11, 21, 22].map(pluralForm)).toEqual([
      'one',
      'few',
      'few',
      'many',
      'many',
      'one',
      'few',
    ]);
  });
});
