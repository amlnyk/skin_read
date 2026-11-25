import { describe, expect, it } from 'vitest';
import { createRealContent } from '@/test/helpers/fakes';
import { compositions, inciContent } from '@/test/data/inciFixtures';
import { PERSONAS } from '@/test/data/personas';
import type { Product } from '@/types';
import { analyzeProduct, prepareComposition } from '../../analyze';
import { buildProfile } from '../../profile';
import { compareProducts, priceDifference } from '../index';

const NOW = Date.UTC(2026, 0, 5, 12);
const IDENTITY = { id: 'profile-1', revision: 1, createdAt: '2026-01-01T12:00:00.000Z' };
const built = buildProfile(PERSONAS.T2, createRealContent('demo').bundle, NOW, IDENTITY);

function product(name: string, text: string, partial: Partial<Product> = {}): Product {
  const prepared = prepareComposition(text, inciContent);
  return {
    id: `p-${name}`,
    name,
    category: 'serum',
    inciRaw: text,
    ingredients: prepared.ingredients,
    compositionSource: 'pasted',
    userReactions: [],
    addedAt: '2026-01-02T10:00:00.000Z',
    ...partial,
  };
}

function compare(a: Product, b: Product, prices?: Parameters<typeof priceDifference>[0]) {
  return compareProducts({
    a,
    b,
    ...(prices ? { prices } : {}),
    idA: 'cmp-a',
    idB: 'cmp-b',
    profile: built.profile,
    analysis: built.analysis,
    routines: [],
    products: [],
    content: inciContent,
    now: NOW,
  });
}

// Invented compositions (not cosmetology content): two with a retinoid, one with vitamin C, one plain.
const RETINOL = 'Aqua, Glycerin, Retinol, Panthenol, Squalane, Tocopherol';
const RETINAL = 'Aqua, Glycerin, Retinal, Allantoin, Squalane, Sodium Hyaluronate';
const VITAMIN_C = 'Aqua, Glycerin, Ascorbic Acid, Panthenol, Allantoin, Tocopherol';
const PLAIN = 'Aqua, Glycerin, Panthenol, Allantoin, Squalane';
const TWO_PLAIN = 'Aqua, Glycerin, Allantoin, Sodium Hyaluronate, Zinc PCA';

describe('compareProducts: the similarity', () => {
  it('the same category and a shared active group: likely similar in function', () => {
    const result = compare(product('a', RETINOL), product('b', RETINAL));
    expect(result.sameCategory).toBe(true);
    expect(result.sharedActiveGroupIds).toEqual(['retinoids']);
    expect(result.similarity).toBe('likely_similar_function');
  });

  it('different categories: different, even with a shared active group', () => {
    const result = compare(
      product('a', RETINOL),
      product('b', RETINAL, { category: 'moisturizer' }),
    );
    expect(result.sameCategory).toBe(false);
    expect(result.similarity).toBe('different');
  });

  it('the same category, a shared group that is not marked active: only partially', () => {
    const result = compare(
      product('a', 'Aqua, Glycerin, Cetearyl Alcohol, Panthenol, Squalane, Phenoxyethanol'),
      product('b', 'Aqua, Glycerin, Cetearyl Alcohol, Allantoin, Tocopherol, Sodium Benzoate'),
    );
    expect(result.sharedGroupIds).toEqual(
      expect.arrayContaining(['fatty_alcohols', 'preservatives']),
    );
    expect(result.sharedActiveGroupIds).toEqual([]);
    expect(result.similarity).toBe('partially');
  });

  it('the same category and no shared group at all: different', () => {
    const result = compare(product('a', RETINOL), product('b', VITAMIN_C));
    expect(result.sharedGroupIds).toEqual([]);
    expect(result.similarity).toBe('different');
  });

  it('shared plain ingredients without a group are not a similarity of function', () => {
    const result = compare(product('a', PLAIN), product('b', TWO_PLAIN));
    expect(result.sharedIngredientIds).toEqual(
      expect.arrayContaining(['aqua', 'glycerin', 'allantoin']),
    );
    expect(result.similarity).toBe('different');
  });

  it('one composition is too short: insufficient info, whatever the categories', () => {
    expect(compare(product('a', RETINOL), product('b', compositions.F3)).similarity).toBe(
      'insufficient_info',
    );
    expect(
      compare(product('a', RETINOL), product('b', compositions.F3, { category: 'moisturizer' }))
        .similarity,
    ).toBe('insufficient_info');
  });

  it('a product with no composition at all: insufficient info', () => {
    const empty = product('empty', '', { ingredients: [], inciRaw: '' });
    expect(compare(product('a', RETINOL), empty).similarity).toBe('insufficient_info');
  });

  it('too many unknown positions: insufficient info', () => {
    const unreadable = product('x', 'Aqua, Zzzqx, Yyyqx, Wwwqx, Vvvqx, Uuuqx');
    expect(compare(product('a', RETINOL), unreadable).similarity).toBe('insufficient_info');
  });

  it('a fuzzy match nobody confirmed does not make products "similar"', () => {
    // "Retinoll" is a possible match to retinol: it must not count as a shared active group
    const possible = product('p', 'Aqua, Glycerin, Retinoll, Panthenol, Squalane, Tocopherol');
    const result = compare(product('a', RETINOL), possible);
    expect(result.similarity).not.toBe('likely_similar_function');
    expect(result.sharedActiveGroupIds).toEqual([]);
  });
});

describe('compareProducts: what is the same and what differs', () => {
  it('lists the shared and the own groups and ingredients, each once and in label order', () => {
    const result = compare(product('a', RETINOL), product('b', RETINAL));
    expect(result.sharedIngredientIds).toEqual(['aqua', 'glycerin', 'squalane']);
    expect(result.onlyAIngredientIds).toEqual(['retinol', 'panthenol', 'tocopherol']);
    expect(result.onlyBIngredientIds).toEqual(['retinal', 'allantoin', 'sodium-hyaluronate']);
    expect(result.sharedGroupIds).toEqual(['retinoids']);
    expect(result.onlyAGroupIds).toEqual([]);
  });

  it('comparing a product with itself: everything shared, nothing own', () => {
    const one = product('a', RETINOL);
    const result = compare(one, { ...one, id: 'p-copy' });
    expect(result.onlyAIngredientIds).toEqual([]);
    expect(result.onlyBIngredientIds).toEqual([]);
    expect(result.similarity).toBe('likely_similar_function');
  });

  it('carries the full analysis of each product, the same as a single check', () => {
    const a = product('a', RETINOL);
    const b = product('b', RETINAL);
    const result = compare(a, b);
    const alone = analyzeProduct({
      id: 'cmp-a',
      product: a,
      profile: built.profile,
      analysis: built.analysis,
      routines: [],
      products: [],
      content: inciContent,
      now: NOW,
    });
    expect(result.a).toEqual(alone);
    expect(result.b.id).toBe('cmp-b');
  });

  it('is deterministic and does not change its input', () => {
    const a = product('a', RETINOL);
    const b = product('b', RETINAL);
    const before = JSON.stringify([a, b]);
    expect(compare(a, b)).toEqual(compare(a, b));
    expect(JSON.stringify([a, b])).toBe(before);
  });
});

describe('priceDifference', () => {
  it('20 and 12 in a chosen currency: 8, and the cheaper one', () => {
    expect(priceDifference({ a: 20, b: 12, currency: 'UAH' })).toEqual({
      amount: 8,
      currency: 'UAH',
      cheaper: 'b',
    });
    expect(priceDifference({ a: 12, b: 20, currency: 'UAH' })).toEqual({
      amount: 8,
      currency: 'UAH',
      cheaper: 'a',
    });
  });

  it('equal prices: a difference of 0 and "equal" (both prices were typed)', () => {
    expect(priceDifference({ a: 15, b: 15, currency: '€' })).toEqual({
      amount: 0,
      currency: '€',
      cheaper: 'equal',
    });
  });

  it('is rounded to cents, without floating point noise', () => {
    expect(priceDifference({ a: 20.1, b: 12.05, currency: 'USD' })?.amount).toBe(8.05);
  });

  it('without both prices, or without a currency, there is no field at all', () => {
    expect(priceDifference(undefined)).toBeUndefined();
    expect(priceDifference({ a: 20, b: null, currency: 'UAH' })).toBeUndefined();
    expect(priceDifference({ a: null, b: 12, currency: 'UAH' })).toBeUndefined();
    expect(priceDifference({ a: 20, b: 12, currency: null })).toBeUndefined();
    expect(priceDifference({ a: 20, b: 12, currency: '   ' })).toBeUndefined();
  });

  it('a price of 0, a negative or a non-number is not a price', () => {
    expect(priceDifference({ a: 0, b: 12, currency: 'UAH' })).toBeUndefined();
    expect(priceDifference({ a: -5, b: 12, currency: 'UAH' })).toBeUndefined();
    expect(priceDifference({ a: Number.NaN, b: 12, currency: 'UAH' })).toBeUndefined();
    expect(priceDifference({ a: Infinity, b: 12, currency: 'UAH' })).toBeUndefined();
  });

  it('the currency is trimmed and kept short', () => {
    expect(priceDifference({ a: 2, b: 1, currency: '  UAH  ' })?.currency).toBe('UAH');
    expect(priceDifference({ a: 2, b: 1, currency: 'x'.repeat(40) })?.currency).toHaveLength(8);
  });

  it('compareProducts has the field only with prices', () => {
    const a = product('a', RETINOL);
    const b = product('b', RETINAL);
    expect('priceDifference' in compare(a, b)).toBe(false);
    expect(compare(a, b, { a: 20, b: 12, currency: 'UAH' }).priceDifference).toEqual({
      amount: 8,
      currency: 'UAH',
      cheaper: 'b',
    });
  });
});
