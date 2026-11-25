import { describe, expect, it } from 'vitest';
import { compositions, inciContent } from '@/test/inciFixtures';
import {
  coverageOfComposition,
  needsComposition,
  prepareComposition,
  resolveComposition,
} from './composition';
import { groupsForAvoid, groupsForReaction } from './groupMap';
import { ingredientsOfText } from './steps/personalRestrictions';

describe('prepareComposition', () => {
  it('keeps the order of the label, with unknown positions in place', () => {
    const prepared = prepareComposition('Aqua, Mystery, Glycerin', inciContent);
    expect(prepared.ingredients.map((item) => [item.raw, item.matchType])).toEqual([
      ['Aqua', 'exact'],
      ['Mystery', 'unknown'],
      ['Glycerin', 'exact'],
    ]);
    expect(prepared.ingredients.every((item) => item.confirmed)).toBe(true);
  });

  it('a fuzzy match waits for a confirmation, the other tiers do not', () => {
    const prepared = prepareComposition(compositions.F4, inciContent);
    const fuzzy = prepared.ingredients.find((item) => item.raw === 'Niacinamlde');
    expect(fuzzy).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'niacinamide',
      confirmed: false,
    });
    expect(prepared.ingredients.filter((item) => !item.confirmed)).toHaveLength(1);
  });

  it('collects the concentrations as written, a number only for a plain value', () => {
    const prepared = prepareComposition(
      'Aqua, Niacinamide 5%, Glycerin, Panthenol 0,5-2 %',
      inciContent,
    );
    expect(prepared.declaredConcentrations.map((entry) => [entry.raw, entry.percent])).toEqual([
      ['5%', 5],
      ['0,5-2 %', null],
    ]);
  });

  it('an empty text gives an empty composition', () => {
    expect(prepareComposition('  ', inciContent).ingredients).toEqual([]);
  });
});

describe('needsComposition and resolveComposition', () => {
  it('a product with no ingredients and no text needs a composition', () => {
    expect(needsComposition({ ingredients: [], inciRaw: '' })).toBe(true);
    expect(needsComposition({ ingredients: [], inciRaw: ' ' })).toBe(true);
    expect(needsComposition({ ingredients: [], inciRaw: 'Aqua' })).toBe(false);
  });

  it('the reviewed positions win over the raw text', () => {
    const reviewed = prepareComposition('Aqua, Glycerin', inciContent).ingredients;
    const composition = resolveComposition(
      { ingredients: reviewed, inciRaw: 'Retinol' },
      inciContent,
    );
    expect(composition.ingredients).toHaveLength(2);
  });

  it('the coverage does not count a position that waits for a confirmation', () => {
    const composition = resolveComposition(
      { ingredients: [], inciRaw: compositions.F4 },
      inciContent,
    );
    const coverage = coverageOfComposition(composition);
    expect(coverage).toMatchObject({ total: 6, recognized: 5, isSufficient: true });
    expect(coverageOfComposition({ ingredients: [], unknown: [] })).toMatchObject({
      total: 0,
      unknownRatio: 0,
      isSufficient: false,
    });
  });
});

describe('the group table', () => {
  it('maps the questionnaire values to content groups', () => {
    expect(groupsForReaction('acids')).toContain('aha');
    expect(groupsForReaction('none_noticed')).toEqual([]);
    expect(groupsForReaction('other')).toEqual([]);
    expect(groupsForAvoid('alcohol')).toEqual(['alcohol_denat']);
    expect(groupsForAvoid('alcohol')).not.toContain('fatty_alcohols');
    expect(groupsForAvoid('none')).toEqual([]);
  });
});

describe('ingredientsOfText', () => {
  it('finds ingredients by name and alias, not by a typo or a group pattern', () => {
    expect(ingredientsOfText('Glycolic Acid; Vitamin B3', inciContent)).toEqual([
      'glycolic-acid',
      'niacinamide',
    ]);
    expect(ingredientsOfText('Niacinamlde', inciContent)).toEqual([]);
    expect(ingredientsOfText('Methylparaben', inciContent)).toEqual([]);
    expect(ingredientsOfText(undefined, inciContent)).toEqual([]);
  });
});
