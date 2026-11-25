import { describe, expect, it } from 'vitest';
import type { CompatStatus } from '@/schemas';
import { inciContent } from '@/test/data/inciFixtures';
import { checkList } from '../checkList';
import type { CompatSubject } from '../types';

const ing = (id: string): CompatSubject => ({ kind: 'ingredient', id });
const ORDER: CompatStatus[] = [
  'not_recommended_for_profile',
  'caution',
  'insufficient_info',
  'no_known_conflicts',
];
const rank = (status: CompatStatus) => ORDER.indexOf(status);

const subjects = [
  ing('glycerin'),
  ing('retinol'),
  ing('lactic-acid'),
  ing('mystery'),
  ing('niacinamide'),
  ing('ascorbic-acid'),
];
const sensitive = { slot: 'pm', profile: { conditions: ['sensitive'], reactions: [] } } as const;

describe('checkList', () => {
  const results = checkList(subjects, sensitive, inciContent);

  it('checks every pair once', () => {
    expect(results).toHaveLength(15);
  });

  it('puts the most important results first', () => {
    const ranks = results.map((result) => rank(result.status));
    expect(ranks).toEqual([...ranks].sort((x, y) => x - y));
    expect(results[0]).toMatchObject({
      status: 'not_recommended_for_profile',
      ruleId: 'r-retinol-lactic',
    });
    expect(results.at(-1)?.status).toBe('no_known_conflicts');
  });

  it('has one "insufficient_info" for each pair with the unknown component', () => {
    const insufficient = results.filter((result) => result.status === 'insufficient_info');
    expect(insufficient).toHaveLength(5);
    expect(insufficient.every((result) => result.reason === 'unknown_subject')).toBe(true);
  });

  it('keeps the order of the pairs inside one status', () => {
    const calm = results.filter((result) => result.status === 'no_known_conflicts');
    expect(calm[0]?.a.id).toBe('glycerin');
  });

  it('ignores a component that is listed twice', () => {
    const twice = checkList([...subjects, ing('retinol')], sensitive, inciContent);
    expect(twice).toHaveLength(15);
  });

  it('has no results for fewer than two components', () => {
    expect(checkList([], {}, inciContent)).toEqual([]);
    expect(checkList([ing('retinol')], {}, inciContent)).toEqual([]);
  });

  it('never says "безпечно" or "заборонено"', () => {
    expect(JSON.stringify(results).toLowerCase()).not.toMatch(/безпечно|заборонено/u);
  });
});
