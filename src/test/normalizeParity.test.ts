import { describe, expect, it } from 'vitest';
import { normalizeName } from '../content/audit';
import { normalizeText } from '../logic/inci';

// The content audit and the search must compare names the same way. The two functions are
// separate copies because the content layer may not import logic.
describe('normalizeName (content audit) and normalizeText (search)', () => {
  const samples = [
    'NIACINAMIDE',
    '  Vitamin   C (5%) ',
    "Пом'якшувальний",
    'Пом’якшувальний',
    'Помʼякшувальний',
    'AHA-кислоти',
    'Йод Їжак',
    'Crème Brûlée',
    '--',
    '',
    'Sodium Lauryl Sulfate',
    'ґанок `test` ´x´',
  ];
  it.each(samples)('gives the same result for %j', (sample) => {
    expect(normalizeName(sample)).toBe(normalizeText(sample));
  });
});
