import { describe, expect, it } from 'vitest';
import { inciContent } from '@/test/data/inciFixtures';
import { group, ingredient } from '@/test/data/referenceContent';
import { DEFAULT_INCI_CONFIG } from '../../config';
import { compilePattern, normalizeIngredients } from '../normalizeIngredients';
import { parseInci } from '../parseInci';

const run = (text: string, content = inciContent) =>
  normalizeIngredients(parseInci(text).items, content);

const first = (text: string) => {
  const { matched, unknown } = run(text);
  return { matched: matched[0], unknown: unknown[0] };
};

describe('normalizeIngredients: exact and alias', () => {
  it('matches the INCI name exactly, ignoring case and punctuation', () => {
    const { matched } = first('GLYCERIN');
    expect(matched).toMatchObject({
      matchType: 'exact',
      ingredientId: 'glycerin',
      needsConfirmation: false,
      distance: 0,
    });
  });

  it('matches English and Ukrainian synonyms as "alias"', () => {
    expect(first('Water').matched).toMatchObject({ matchType: 'alias', ingredientId: 'aqua' });
    expect(first('Гліцерин').matched).toMatchObject({
      matchType: 'alias',
      ingredientId: 'glycerin',
    });
    expect(first('Vitamin B3').matched).toMatchObject({
      matchType: 'alias',
      ingredientId: 'niacinamide',
    });
  });

  it('finds an item by any of its names', () => {
    expect(first('Aqua (Water)').matched).toMatchObject({
      matchType: 'exact',
      ingredientId: 'aqua',
    });
    expect(first('Eau (Water)').matched).toMatchObject({
      matchType: 'alias',
      ingredientId: 'aqua',
    });
    expect(first('Caprylic/Glycerin').matched).toMatchObject({ ingredientId: 'glycerin' });
  });

  it('puts an exact INCI match before an alias of another ingredient', () => {
    const content = {
      ingredients: [ingredient('bar', 'Bar', { aliases: ['Foo'] }), ingredient('foo', 'Foo')],
      ingredientGroups: [],
    };
    const { matched } = normalizeIngredients(parseInci('Foo').items, content);
    expect(matched[0]).toMatchObject({ matchType: 'exact', ingredientId: 'foo' });
  });

  it('gives the groups of the ingredient', () => {
    expect(first('Glycolic Acid').matched?.groupIds).toEqual(['acids', 'aha']);
    expect(first('Retinol').matched?.groupIds).toEqual(['retinoids']);
  });

  it('does not put Cetearyl Alcohol into the denatured alcohol group', () => {
    const groups = first('Cetearyl Alcohol').matched?.groupIds ?? [];
    expect(groups).toEqual(['fatty_alcohols']);
    expect(groups).not.toContain('alcohol_denat');
  });

  it('adds the groups whose patterns fit, once', () => {
    expect(first('Parfum').matched?.groupIds).toEqual(['fragrance']);
  });
});

describe('normalizeIngredients: group patterns', () => {
  it.each([
    ['Sodium Lauryl Sulfate', 'sulfates'],
    ['Dimethicone', 'silicones'],
    ['Methylparaben', 'parabens'],
    ['Ceramide 6 II', 'ceramides'],
    ['Alcohol Denat.', 'alcohol_denat'],
    ['SD Alcohol 40-B', 'alcohol_denat'],
    ['Cetyl Alcohol', 'fatty_alcohols'],
    ['Aroma', 'fragrance'],
  ])('%j fits the group %s by pattern', (text, groupId) => {
    expect(first(text).matched).toMatchObject({
      matchType: 'group_pattern',
      ingredientId: null,
      groupIds: [groupId],
      needsConfirmation: false,
    });
  });

  it('does not let "alcohol denat" swallow other alcohols', () => {
    expect(first('Stearyl Alcohol').matched?.groupIds).toEqual(['fatty_alcohols']);
    expect(first('Benzyl Alcohol').matched).toBeUndefined();
  });

  it('knows the pattern grammar', () => {
    expect(compilePattern('g', '*sulfate')).toEqual({
      groupId: 'g',
      mode: 'endsWith',
      core: 'sulfate',
    });
    expect(compilePattern('g', 'peg-*')).toEqual({ groupId: 'g', mode: 'startsWith', core: 'peg' });
    expect(compilePattern('g', '*oxy*')).toEqual({ groupId: 'g', mode: 'contains', core: 'oxy' });
    expect(compilePattern('g', 'Parfum')).toEqual({ groupId: 'g', mode: 'equals', core: 'parfum' });
    expect(compilePattern('g', '*')).toBeNull();
  });

  it('supports "contains" patterns from the content', () => {
    const content = {
      ingredients: [],
      ingredientGroups: [group('g', 'Група', { patterns: ['*oxy*'] })],
    };
    const { matched } = normalizeIngredients(parseInci('Phenoxyethanol').items, content);
    expect(matched[0]).toMatchObject({ matchType: 'group_pattern', groupIds: ['g'] });
  });
});

describe('normalizeIngredients: fuzzy', () => {
  it('matches a typo and asks for a confirmation', () => {
    expect(first('Niacinamlde').matched).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'niacinamide',
      needsConfirmation: true,
      distance: 1,
    });
  });

  it('allows one change in words of 5 to 8 characters', () => {
    expect(first('Glycrin').matched).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'glycerin',
    });
    expect(first('Glycrn').matched).toBeUndefined();
    expect(first('Glycrn').unknown?.suggestions).toEqual([]);
  });

  it('allows two changes in words of 9 characters and more', () => {
    expect(first('Niacnamde').matched).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'niacinamide',
      distance: 2,
    });
  });

  it('never searches for words shorter than 5 characters', () => {
    expect(first('Aqau').matched).toBeUndefined();
    expect(first('Aqau').unknown?.suggestions).toEqual([]);
    expect(first('Aloe').matched).toBeUndefined();
  });

  it('takes the thresholds from the config', () => {
    const config = { ...DEFAULT_INCI_CONFIG, fuzzyShortDistance: 2 };
    const { matched } = normalizeIngredients(parseInci('Glycrn').items, inciContent, config);
    expect(matched[0]).toMatchObject({ matchType: 'fuzzy', ingredientId: 'glycerin', distance: 2 });
  });

  it('leaves a tie unknown and offers suggestions', () => {
    // "Retinil" is one change away from both Retinol and Retinal
    const { matched, unknown } = first('Retinil');
    expect(matched).toBeUndefined();
    expect(unknown?.suggestions).toEqual(['retinol', 'retinal']);
  });

  it('picks the nearer one when the distances differ', () => {
    expect(first('Retinoll').matched).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'retinol',
    });
  });

  it('puts a higher tier before a nearer fuzzy match', () => {
    expect(first('Retinal').matched).toMatchObject({ matchType: 'exact', ingredientId: 'retinal' });
  });

  it('offers no suggestions for a name that is far from everything', () => {
    expect(first('Completely Unrelated Thing').unknown).toEqual({
      item: expect.objectContaining({ name: 'completely unrelated thing' }),
      suggestions: [],
    });
  });
});

describe('normalizeIngredients: the whole list', () => {
  it('keeps the order and splits matched and unknown', () => {
    const { matched, unknown } = run('Aqua, Mystery Extract, Glycerin');
    expect(matched.map((entry) => entry.item.position)).toEqual([1, 3]);
    expect(unknown.map((entry) => entry.item.position)).toEqual([2]);
  });

  it('works with empty content', () => {
    const { matched, unknown } = normalizeIngredients(parseInci('Aqua, Glycerin').items, {
      ingredients: [],
      ingredientGroups: [],
    });
    expect(matched).toEqual([]);
    expect(unknown).toHaveLength(2);
  });
});
