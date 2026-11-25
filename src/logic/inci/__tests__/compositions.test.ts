import { describe, expect, it } from 'vitest';
import { compositions, inciContent } from '@/test/data/inciFixtures';
import { coverage } from '../coverage';
import { normalizeIngredients } from '../normalizeIngredients';
import { parseInci } from '../parseInci';

// The fixtures F1-F7 of the plan (chapter 6): synthetic compositions on invented content.

function analyse(text: string) {
  const parsed = parseInci(text);
  const result = normalizeIngredients(parsed.items, inciContent);
  return { ...parsed, ...result, coverage: coverage(result.matched, result.unknown) };
}

const matchedBy = (analysis: ReturnType<typeof analyse>, name: string) =>
  analysis.matched.find((entry) => entry.item.name === name);

describe('F1: a plain list with a prefix and a final period', () => {
  const analysis = analyse(compositions.F1);

  it('has 9 items without the prefix and the period', () => {
    expect(analysis.items).toHaveLength(9);
    expect(analysis.items[0]?.name).toBe('aqua');
    expect(analysis.items[8]?.raw).toBe('Phenoxyethanol');
    expect(analysis.warnings).toEqual([]);
  });

  it('knows every item', () => {
    expect(analysis.unknown).toEqual([]);
    expect(analysis.coverage).toMatchObject({ total: 9, recognized: 9, isSufficient: true });
  });

  it('takes Cetearyl Alcohol as a fatty alcohol and not as denatured alcohol', () => {
    const groups = matchedBy(analysis, 'cetearyl alcohol')?.groupIds ?? [];
    expect(groups).toContain('fatty_alcohols');
    expect(groups).not.toContain('alcohol_denat');
  });
});

describe('F2: synonyms in brackets and groups', () => {
  const analysis = analyse(compositions.F2);

  it('has 7 items with alternative names', () => {
    expect(analysis.items).toHaveLength(7);
    expect(analysis.items[0]).toMatchObject({ name: 'aqua', altNames: ['water'] });
    expect(analysis.items[4]).toMatchObject({ name: 'parfum', altNames: ['fragrance'] });
  });

  it('puts glycolic acid into AHA and the fragrances into the fragrance group', () => {
    expect(matchedBy(analysis, 'glycolic acid')?.groupIds).toContain('aha');
    for (const name of ['parfum', 'limonene', 'linalool']) {
      expect(matchedBy(analysis, name)?.groupIds).toContain('fragrance');
    }
  });

  it('knows every item', () => {
    expect(analysis.unknown).toEqual([]);
  });
});

describe('F3: too short to analyse', () => {
  it('has 2 items and is not sufficient', () => {
    const analysis = analyse(compositions.F3);
    expect(analysis.items).toHaveLength(2);
    expect(analysis.coverage.isSufficient).toBe(false);
  });
});

describe('F4: a typo', () => {
  const analysis = analyse(compositions.F4);

  it('has 6 items and the typo is a fuzzy match that needs a confirmation', () => {
    expect(analysis.items).toHaveLength(6);
    expect(matchedBy(analysis, 'niacinamlde')).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'niacinamide',
      needsConfirmation: true,
    });
  });

  it('does not count the unconfirmed match as recognized', () => {
    expect(analysis.coverage).toMatchObject({ total: 6, recognized: 5, isSufficient: true });
  });
});

describe('F5: two lists', () => {
  const analysis = analyse(compositions.F5);

  it('warns and analyses the first list of 3 items', () => {
    expect(analysis.warnings).toEqual(['multiple_lists_detected']);
    expect(analysis.items.map((item) => item.name)).toEqual(['aqua', 'glycerin', 'parfum']);
    expect(analysis.coverage.isSufficient).toBe(false);
  });
});

describe('F6: list markers', () => {
  it('has 4 items from the bulleted lines', () => {
    const analysis = analyse(compositions.F6);
    expect(analysis.items.map((item) => item.name)).toEqual([
      'aqua',
      'glycerin',
      'niacinamide',
      'zinc pca',
    ]);
    expect(analysis.unknown).toEqual([]);
  });
});

describe('F7: asterisks, footnotes and a concentration', () => {
  const analysis = analyse(compositions.F7);

  it('has 6 items without asterisks and footnotes', () => {
    expect(analysis.items.map((item) => item.raw)).toEqual([
      'Aqua',
      'Niacinamide 5%',
      'Glycerin',
      'Parfum',
      'Tocopherol',
      'Sodium Benzoate',
    ]);
    expect(analysis.items.some((item) => item.name.includes('органіч'))).toBe(false);
  });

  it('keeps the declared concentration as written', () => {
    const niacinamide = analysis.items.find((item) => item.name === 'niacinamide');
    expect(niacinamide?.declaredConcentration).toBe('5%');
    expect(analysis.items.filter((item) => item.declaredConcentration !== null)).toHaveLength(1);
    expect(analysis.unknown).toEqual([]);
  });
});
