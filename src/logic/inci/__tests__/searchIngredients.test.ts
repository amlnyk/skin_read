import { describe, expect, it } from 'vitest';
import {
  APOSTROPHE,
  CETEARYL,
  GROUP_ALCOHOL,
  GROUP_FATTY,
  GROUP_NIACINAMIDE,
  NIACINAMIDE,
  PLACEHOLDER_LIKE,
  REFERENCE_GROUPS,
  REFERENCE_INGREDIENTS,
  SD_ALCOHOL,
  ingredient,
} from '@/test/data/referenceContent';
import {
  categoriesOf,
  ingredientsOfGroup,
  normalizeText,
  searchGroups,
  searchIngredients,
  ungroupedIngredients,
} from '../index';

const content = { ingredients: REFERENCE_INGREDIENTS, ingredientGroups: REFERENCE_GROUPS };

describe('normalizeText', () => {
  it('ignores case, diacritics, apostrophes and punctuation', () => {
    expect(normalizeText('  NIACINAMIDE ')).toBe('niacinamide');
    expect(normalizeText('Crème Brûlée')).toBe('creme brulee');
    // the final "й" is folded into "и" (see normalizeText)
    expect(normalizeText("Пом'якшувальний")).toBe('помякшувальнии');
    expect(normalizeText('Пом’якшувальний')).toBe('помякшувальнии');
    expect(normalizeText('Пом\u02bcякшувальний')).toBe('помякшувальнии');
    expect(normalizeText('AHA-кислоти')).toBe('aha кислоти');
    expect(normalizeText('Vitamin   C (5%)')).toBe('vitamin c 5');
  });

  it('folds the Ukrainian й and ї, so a changed letter still finds the word', () => {
    expect(normalizeText('Йод')).toBe(normalizeText('Иод'));
    expect(normalizeText('Їжак')).toBe(normalizeText('Іжак'));
  });

  it('returns an empty string for text without letters', () => {
    expect(normalizeText(' -- !! ')).toBe('');
  });
});

describe('searchIngredients', () => {
  it('finds the same card by Ukrainian name, INCI and alias in any case', () => {
    for (const query of [
      'ніацинамід',
      'Ніацинамід',
      'НІАЦИНАМІД',
      'niacinamide',
      'NIACINAMIDE',
      'нікотинамід',
      'vitamin b3',
    ]) {
      expect(searchIngredients(query, content), query).toEqual([NIACINAMIDE]);
    }
  });

  it('finds a word with an apostrophe whichever apostrophe is typed', () => {
    for (const query of [
      "пом'якшувальний",
      'пом’якшувальний',
      'помякшувальний',
      'ПОМʼЯКШУВАЛЬНИЙ',
    ]) {
      expect(searchIngredients(query, content), query).toEqual([APOSTROPHE]);
    }
  });

  it('finds a part of a name', () => {
    expect(searchIngredients('цінам', content)).toEqual([]);
    expect(searchIngredients('ніацин', content)).toEqual([NIACINAMIDE]);
    expect(searchIngredients('amide', content)).toEqual([NIACINAMIDE]);
  });

  it('finds an ingredient by several words in any order', () => {
    expect(searchIngredients('alcohol cetearyl', content)).toEqual([CETEARYL]);
  });

  it('returns nothing for a query that is not in the base', () => {
    expect(searchIngredients('невідомий компонент', content)).toEqual([]);
    expect(searchIngredients('xyz123', content)).toEqual([]);
  });

  it('returns everything in content order for an empty query', () => {
    expect(searchIngredients('', content)).toEqual(REFERENCE_INGREDIENTS);
    expect(searchIngredients('   ', content)).toEqual(REFERENCE_INGREDIENTS);
    expect(searchIngredients('--', content)).toEqual(REFERENCE_INGREDIENTS);
  });

  it('ranks an exact name before a prefix, a word start and an occurrence', () => {
    const exact = ingredient('a', 'Zinc');
    const prefix = ingredient('b', 'Zinc Oxide');
    const word = ingredient('c', 'Pyrithione Zinc');
    const inside = ingredient('d', 'Fezincol');
    const result = searchIngredients('zinc', { ingredients: [inside, word, prefix, exact] });
    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps the content order for equal scores', () => {
    const first = ingredient('first', 'Alpha Extract');
    const second = ingredient('second', 'Beta Extract');
    expect(searchIngredients('extract', { ingredients: [first, second] }).map((i) => i.id)).toEqual(
      ['first', 'second'],
    );
  });

  it('does not change the content', () => {
    const before = [...REFERENCE_INGREDIENTS];
    searchIngredients('alcohol', content);
    expect(REFERENCE_INGREDIENTS).toEqual(before);
  });

  it('filters by category, with and without a query', () => {
    expect(searchIngredients('', content, { category: 'Емолент' })).toEqual([CETEARYL]);
    expect(searchIngredients('alcohol', content, { category: 'Розчинник' })).toEqual([SD_ALCOHOL]);
    expect(searchIngredients('niacinamide', content, { category: 'Емолент' })).toEqual([]);
    expect(searchIngredients('alcohol', content, { category: null })).toHaveLength(2);
  });

  it('is not confused by records without names', () => {
    expect(searchIngredients('pending', content)).toEqual([PLACEHOLDER_LIKE]);
  });
});

describe('groups', () => {
  it('Cetearyl Alcohol is not among the denatured alcohol ingredients, but among the fatty alcohols', () => {
    expect(ingredientsOfGroup('alcohol_denat', content)).toEqual([SD_ALCOHOL]);
    expect(ingredientsOfGroup('fatty_alcohols', content)).toEqual([CETEARYL]);
    expect(ingredientsOfGroup('alcohol_denat', content)).not.toContain(CETEARYL);
  });

  it('finds groups by name', () => {
    // "спирт" starts both words; equal scores keep the order of the content
    expect(searchGroups('СПИРТ', content)).toEqual([GROUP_ALCOHOL, GROUP_FATTY]);
    expect(searchGroups('жирні', content)).toEqual([GROUP_FATTY]);
    expect(searchGroups('ніацинамід', content)).toEqual([GROUP_NIACINAMIDE]);
    expect(searchGroups('нічого', content)).toEqual([]);
    expect(searchGroups('', content)).toEqual(REFERENCE_GROUPS);
  });

  it('lists ingredients that belong to no visible group', () => {
    expect(ungroupedIngredients(content)).toEqual([APOSTROPHE, PLACEHOLDER_LIKE]);
    // a group that the policy hid does not count as a group
    expect(ungroupedIngredients({ ingredients: [NIACINAMIDE], ingredientGroups: [] })).toEqual([
      NIACINAMIDE,
    ]);
  });

  it('lists the distinct non-empty categories, sorted', () => {
    expect(categoriesOf(content)).toEqual(['Активний компонент', 'Емолент', 'Розчинник']);
    expect(categoriesOf({ ingredients: [ingredient('x', 'X', { category: '  ' })] })).toEqual([]);
  });
});
