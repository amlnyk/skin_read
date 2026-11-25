import { describe, expect, it } from 'vitest';
import { levenshtein } from './levenshtein';

describe('levenshtein', () => {
  it.each([
    ['kitten', 'sitting', 3],
    ['', '', 0],
    ['', 'abc', 3],
    ['abc', '', 3],
    ['same', 'same', 0],
    ['niacinamlde', 'niacinamide', 1],
    ['flaw', 'lawn', 2],
  ])('%j and %j are %i apart', (a, b, distance) => {
    expect(levenshtein(a, b)).toBe(distance);
    expect(levenshtein(b, a)).toBe(distance);
  });

  it('counts Cyrillic letters as one character each', () => {
    expect(levenshtein('ніацин', 'ніацін')).toBe(1);
  });

  it('stops early and returns limit + 1 when the distance is above the limit', () => {
    expect(levenshtein('abcdef', 'uvwxyz', 2)).toBe(3);
    expect(levenshtein('abc', 'abcdefgh', 2)).toBe(3);
    expect(levenshtein('', 'abcd', 2)).toBe(3);
    expect(levenshtein('a', 'b', 0)).toBe(1);
  });

  it('is exact when the distance is within the limit', () => {
    expect(levenshtein('niacinamlde', 'niacinamide', 1)).toBe(1);
    expect(levenshtein('niacnamde', 'niacinamide', 2)).toBe(2);
    expect(levenshtein('same', 'same', 0)).toBe(0);
  });
});
