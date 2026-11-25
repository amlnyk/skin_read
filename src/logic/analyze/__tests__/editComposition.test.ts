import { describe, expect, it } from 'vitest';
import { compositions, inciContent } from '@/test/data/inciFixtures';
import type { Product, SkinProfile } from '@/types';
import {
  appendText,
  compositionText,
  confirmPosition,
  groupName,
  ingredientName,
  markReaction,
  prepareComposition,
  removePosition,
  replacePosition,
} from '../index';

const base = () => prepareComposition(compositions.F4, inciContent).ingredients;

describe('editing the composition', () => {
  it('confirming turns a possible match into a recognised one and touches nothing else', () => {
    const items = base();
    const fuzzy = items.find((item) => item.matchType === 'fuzzy');
    expect(fuzzy?.confirmed).toBe(false);
    const after = confirmPosition(items, fuzzy?.position ?? 0);
    expect(after.find((item) => item.matchType === 'fuzzy')?.confirmed).toBe(true);
    expect(after.filter((item) => !item.confirmed)).toEqual([]);
    // the input is not changed
    expect(items.find((item) => item.matchType === 'fuzzy')?.confirmed).toBe(false);
    // an exact position cannot be "confirmed" into anything else
    expect(confirmPosition(items, 1)).toEqual(items);
  });

  it('removing renumbers the positions from 1', () => {
    const after = removePosition(base(), 2);
    expect(after.map((item) => item.position)).toEqual([1, 2, 3, 4, 5]);
    expect(after.map((item) => item.raw)).not.toContain('Niacinamlde');
  });

  it('fixing a position re-reads the new text; an empty fix changes nothing', () => {
    const items = base();
    const fixed = replacePosition(items, 2, 'Niacinamide', inciContent);
    expect(fixed[1]).toMatchObject({
      raw: 'Niacinamide',
      matchType: 'exact',
      confirmed: true,
      position: 2,
    });
    expect(replacePosition(items, 2, '  ', inciContent)).toEqual(items);
    const two = replacePosition(items, 2, 'Niacinamide, Retinol', inciContent);
    expect(two).toHaveLength(items.length + 1);
    expect(two.map((item) => item.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('adding appends to the end, and the same known ingredient is not added twice', () => {
    const items = base();
    const more = appendText(items, 'Retinol, Aqua, Mystery', inciContent);
    expect(more.map((item) => item.raw).slice(-2)).toEqual(['Retinol', 'Mystery']);
    expect(more.at(-1)).toMatchObject({ matchType: 'unknown', ingredientId: null });
    expect(more.map((item) => item.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('the raw text follows the label order', () => {
    expect(compositionText(prepareComposition('Aqua, Glycerin', inciContent).ingredients)).toBe(
      'Aqua, Glycerin',
    );
  });
});

describe('markReaction', () => {
  const profile = {
    id: 'p',
    revision: 2,
    reactionIngredients: ['retinol'],
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as SkinProfile;
  const product = { id: 'x', userReactions: [] } as unknown as Product;
  const NOW = '2026-02-02T10:00:00.000Z';

  it('adds new ingredients, raises the revision and writes the note on the product', () => {
    const result = markReaction(
      profile,
      product,
      ['glycolic-acid', 'retinol', 'glycolic-acid'],
      NOW,
    );
    expect(result.added).toEqual(['glycolic-acid']);
    expect(result.profile.reactionIngredients).toEqual(['retinol', 'glycolic-acid']);
    expect(result.profile.revision).toBe(3);
    expect(result.profile.updatedAt).toBe(NOW);
    expect(result.product.userReactions).toEqual([{ at: NOW, note: 'glycolic-acid, retinol' }]);
    // the originals stay as they were
    expect(profile.reactionIngredients).toEqual(['retinol']);
    expect(product.userReactions).toEqual([]);
  });

  it('marking only what is already marked keeps the revision', () => {
    const result = markReaction(profile, product, ['retinol'], NOW);
    expect(result.profile).toBe(profile);
    expect(result.added).toEqual([]);
  });
});

describe('names', () => {
  it('uses the Ukrainian name, then the INCI name, then the id', () => {
    const aqua = inciContent.ingredients.find((entry) => entry.id === 'aqua');
    if (!aqua) throw new Error('fixture: aqua');
    const unnamed = [{ ...aqua, nameUk: null }];
    expect(ingredientName('aqua', inciContent.ingredients)).toBe('Вода');
    expect(ingredientName('aqua', unnamed)).toBe('Aqua');
    expect(ingredientName('squalane', inciContent.ingredients)).toBe('Squalane');
    expect(ingredientName('nope', inciContent.ingredients)).toBe('nope');
    expect(groupName('acids', inciContent.ingredientGroups)).toBe('Кислоти');
    expect(groupName('acids', [{ ...inciContent.ingredientGroups[0]!, nameUk: null }])).toBeNull();
    expect(groupName('nope', inciContent.ingredientGroups)).toBeNull();
  });
});
