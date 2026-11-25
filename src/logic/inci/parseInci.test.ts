import { describe, expect, it } from 'vitest';
import { DEFAULT_INCI_CONFIG } from '../config';
import { parseInci } from './parseInci';

const names = (text: string) => parseInci(text).items.map((item) => item.name);

describe('parseInci: prefixes', () => {
  it.each([
    'Ingredients: Aqua, Glycerin',
    'INGREDIENTS: Aqua, Glycerin',
    'ingredients : Aqua, Glycerin',
    'INCI: Aqua, Glycerin',
    'Composition: Aqua, Glycerin',
    'Склад: Aqua, Glycerin',
    'СКЛАД: Aqua, Glycerin',
    'Состав: Aqua, Glycerin',
    'Aqua, Glycerin',
  ])('%j gives two items', (text) => {
    const result = parseInci(text);
    expect(result.items.map((item) => item.name)).toEqual(['aqua', 'glycerin']);
    expect(result.warnings).toEqual([]);
  });

  it('ignores the text before the only prefix', () => {
    expect(names('Cream Name. Ingredients: Aqua, Glycerin')).toEqual(['aqua', 'glycerin']);
  });

  it('warns about several lists and analyses the first one', () => {
    const result = parseInci(
      'Склад: Aqua, Glycerin, Parfum. Ingredients: Water, Glycerin, Fragrance.',
    );
    expect(result.warnings).toEqual(['multiple_lists_detected']);
    expect(result.items.map((item) => item.name)).toEqual(['aqua', 'glycerin', 'parfum']);
  });
});

describe('parseInci: splitting', () => {
  it('splits on commas, semicolons and new lines', () => {
    expect(names('Aqua, Glycerin; Panthenol\nSqualane')).toEqual([
      'aqua',
      'glycerin',
      'panthenol',
      'squalane',
    ]);
  });

  it('understands list markers', () => {
    expect(names('• Aqua\n· Glycerin\n- Panthenol\n* Squalane')).toEqual([
      'aqua',
      'glycerin',
      'panthenol',
      'squalane',
    ]);
  });

  it('does not split on a comma inside brackets', () => {
    const result = parseInci('Aqua (Water, Eau), Glycerin');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.altNames).toEqual(['water', 'eau']);
  });

  it('keeps a hyphen inside a name', () => {
    expect(names('Polyglyceryl-3 Distearate, Aqua')).toEqual(['polyglyceryl 3 distearate', 'aqua']);
  });

  it('drops empty items and numbers the rest from 1', () => {
    const result = parseInci('Aqua,, ,Glycerin;;\n\n');
    expect(result.items.map((item) => [item.position, item.name])).toEqual([
      [1, 'aqua'],
      [2, 'glycerin'],
    ]);
  });

  it('gives no items for an empty text', () => {
    expect(parseInci('')).toEqual({ items: [], warnings: [] });
    expect(parseInci('   \n ')).toEqual({ items: [], warnings: [] });
    expect(parseInci('Ingredients:')).toEqual({ items: [], warnings: [] });
  });

  it('does not break on unmatched or nested brackets', () => {
    expect(parseInci('Aqua (Water, Glycerin').items).toHaveLength(2);
    expect(parseInci('Aqua) Water, Glycerin').items).toHaveLength(2);
    const nested = parseInci('Tocopherol (Vitamin E (Alpha))').items[0];
    expect(nested?.name).toBe('tocopherol');
    expect(nested?.altNames).toEqual(['vitamin e', 'alpha']);
  });
});

describe('parseInci: names', () => {
  it('reads "Aqua (Water)" as one item with two names', () => {
    const item = parseInci('Aqua (Water)').items[0];
    expect(item).toMatchObject({ name: 'aqua', altNames: ['water'], fullName: 'aqua' });
  });

  it('reads "Aqua/Water" as one item with two names', () => {
    const result = parseInci('Aqua/Water, Glycerin');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ name: 'aqua', altNames: ['water'] });
  });

  it('keeps the whole name of a real INCI name that has a slash', () => {
    const item = parseInci('Caprylic/Capric Triglyceride').items[0];
    expect(item?.fullName).toBe('caprylic capric triglyceride');
    expect(item?.altNames).toEqual(['capric triglyceride']);
  });

  it('works with square brackets and Cyrillic names', () => {
    expect(parseInci('Aqua [Water]').items[0]?.altNames).toEqual(['water']);
    expect(parseInci('Вода (Aqua)').items[0]).toMatchObject({ name: 'вода', altNames: ['aqua'] });
  });
});

describe('parseInci: concentration, asterisks, footnotes', () => {
  it.each([
    ['Niacinamide 5%', '5%'],
    ['5% Niacinamide', '5%'],
    ['Niacinamide (5%)', '5%'],
    ['Niacinamide 0,5-2 %', '0,5-2 %'],
  ])('%j keeps the concentration as written', (text, concentration) => {
    const item = parseInci(text).items[0];
    expect(item?.name).toBe('niacinamide');
    expect(item?.altNames).toEqual([]);
    expect(item?.declaredConcentration).toBe(concentration);
  });

  it('does not split a decimal comma, but splits a comma before a letter', () => {
    expect(names('Retinol 0,3 %, Aqua')).toEqual(['retinol', 'aqua']);
    expect(names('CI 77891,CI 77492')).toEqual(['ci 77891', 'ci 77492']);
  });

  it('has no concentration when none is written', () => {
    expect(parseInci('Niacinamide').items[0]?.declaredConcentration).toBeNull();
  });

  it('removes asterisks and the final period', () => {
    const result = parseInci('Glycerin*, Parfum**, Sodium Benzoate.');
    expect(result.items.map((item) => item.raw)).toEqual(['Glycerin', 'Parfum', 'Sodium Benzoate']);
  });

  it('does not take footnote lines for ingredients', () => {
    const text =
      'Aqua, Glycerin*, Parfum.\n*органічний інгредієнт\n**натуральні ароматичні речовини';
    expect(names(text)).toEqual(['aqua', 'glycerin', 'parfum']);
  });

  it('cuts a footnote that follows the period on the same line', () => {
    expect(names('Aqua, Glycerin*. *органічний інгредієнт, натуральні речовини')).toEqual([
      'aqua',
      'glycerin',
    ]);
  });
});

describe('parseInci: long compositions', () => {
  const long = (count: number) =>
    Array.from({ length: count }, (_, index) => `name${index}`).join(', ');

  it('warns when there are more than 300 items and keeps all of them', () => {
    const result = parseInci(long(301));
    expect(result.warnings).toEqual(['too_long']);
    expect(result.items).toHaveLength(301);
  });

  it('does not warn at exactly 300', () => {
    expect(parseInci(long(300)).warnings).toEqual([]);
  });

  it('takes the limit from the config', () => {
    const config = { ...DEFAULT_INCI_CONFIG, maxParsedItems: 3 };
    expect(parseInci(long(4), config).warnings).toEqual(['too_long']);
  });
});
