import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INCI_CONFIG,
  DEFAULT_JOURNAL_CONFIG,
  DEFAULT_ROUTINE_CONFIG,
  fuzzyDistanceFor,
} from './config';

describe('fuzzyDistanceFor', () => {
  it.each([
    [1, 0],
    [4, 0],
    [5, 1],
    [8, 1],
    [9, 2],
    [20, 2],
  ])('a word of %i characters may differ by %i', (length, distance) => {
    expect(fuzzyDistanceFor(length)).toBe(distance);
  });

  it('takes the thresholds from the config', () => {
    const config = { ...DEFAULT_INCI_CONFIG, fuzzyMinLength: 3, fuzzyShortDistance: 2 };
    expect(fuzzyDistanceFor(3, config)).toBe(2);
    expect(fuzzyDistanceFor(2, config)).toBe(0);
  });
});

describe('the routine config', () => {
  it('two active products in one slot are "many" by default', () => {
    expect(DEFAULT_ROUTINE_CONFIG.manyActivesInSlot).toBe(2);
  });
});

describe('the journal config', () => {
  it('4 entries in the last 14 days with intensity 2 or 3 (the plan), "not now" for 7 days', () => {
    expect(DEFAULT_JOURNAL_CONFIG).toEqual({
      windowDays: 14,
      minEntries: 4,
      minIntensity: 2,
      snoozeDays: 7,
    });
  });
});
