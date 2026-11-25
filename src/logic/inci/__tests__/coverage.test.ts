import { describe, expect, it } from 'vitest';
import { DEFAULT_INCI_CONFIG } from '../../config';
import { coverage } from '../coverage';
import type { MatchedItem, ParsedItem, UnknownItem } from '../types';

const item = (position: number): ParsedItem => ({
  position,
  raw: `n${position}`,
  name: `n${position}`,
  altNames: [],
  fullName: `n${position}`,
  declaredConcentration: null,
});

const matched = (position: number, needsConfirmation = false): MatchedItem => ({
  item: item(position),
  matchType: needsConfirmation ? 'fuzzy' : 'exact',
  ingredientId: `i${position}`,
  groupIds: [],
  matchedName: `n${position}`,
  needsConfirmation,
  distance: needsConfirmation ? 1 : 0,
});

const unknown = (position: number): UnknownItem => ({ item: item(position), suggestions: [] });

describe('coverage', () => {
  it('is empty and insufficient for an empty list', () => {
    expect(coverage([], [])).toEqual({
      total: 0,
      recognized: 0,
      unknownRatio: 0,
      isSufficient: false,
    });
  });

  it('is insufficient when there are fewer than the minimum of items', () => {
    const result = coverage([matched(1), matched(2), matched(3), matched(4)], []);
    expect(result).toMatchObject({ total: 4, recognized: 4, unknownRatio: 0, isSufficient: false });
  });

  it('is sufficient at the minimum of items with everything recognized', () => {
    const items = [1, 2, 3, 4, 5].map((n) => matched(n));
    expect(coverage(items, []).isSufficient).toBe(true);
  });

  it('allows an unknown ratio up to the limit and not above it', () => {
    const items = [1, 2, 3].map((n) => matched(n));
    expect(coverage(items, [unknown(4), unknown(5)]).isSufficient).toBe(true); // 2 / 5 = 0.4
    expect(coverage([matched(1), matched(2)], [3, 4, 5].map(unknown)).isSufficient).toBe(false); // 0.6
  });

  it('does not count a fuzzy match that waits for a confirmation', () => {
    const waiting = coverage(
      [matched(1), matched(2), matched(3), matched(4), matched(5, true)],
      [],
    );
    expect(waiting).toMatchObject({
      total: 5,
      recognized: 4,
      unknownRatio: 0.2,
      isSufficient: true,
    });
  });

  it('takes the limits from the config', () => {
    const config = { ...DEFAULT_INCI_CONFIG, minIngredients: 2 };
    expect(coverage([matched(1), matched(2)], [], config).isSufficient).toBe(true);
  });
});
