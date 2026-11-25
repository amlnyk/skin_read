import { describe, expect, it } from 'vitest';
import { scanResultSchema } from '@/schemas';
import { compositions, inciContent } from '@/test/data/inciFixtures';
import { createRealContent } from '@/test/helpers/fakes';
import { PERSONAS } from '@/test/data/personas';
import type { Product, Routine, ScanResult, SkinProfile, TestAnswers } from '@/types';
import { buildProfile, type ProfileAnalysis } from '../../profile';
import { analyzeProduct, needsComposition, prepareComposition } from '../index';

const NOW = Date.UTC(2026, 0, 5, 12);
const IDENTITY = { id: 'profile-1', revision: 3, createdAt: '2026-01-01T12:00:00.000Z' };
const realContent = createRealContent('demo');

// T7 comes from the plan (section 5): oily, sensitive, no known reactions, wants to avoid fragrance, 25-34.
const T7: TestAnswers = PERSONAS.T7;

type Persona = { profile: SkinProfile; analysis: ProfileAnalysis };

function persona(answers: TestAnswers, patch: Partial<SkinProfile> = {}): Persona {
  const built = buildProfile(answers, realContent.bundle, NOW, IDENTITY);
  return { profile: { ...built.profile, ...patch }, analysis: built.analysis };
}

const T1 = persona(PERSONAS.T1);
const T2 = persona(PERSONAS.T2);
const T7P = persona(T7);

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

function routineOf(...entries: [slot: 'am' | 'pm', ...products: Product[]][]): Routine[] {
  return entries.map(([slot, ...list]) => ({
    id: `routine-${slot}`,
    slot,
    steps: list.map((item, order) => ({
      id: `step-${slot}-${order}`,
      order,
      category: item.category,
      productId: item.id,
      status: 'owned' as const,
      frequency: 'daily' as const,
    })),
  }));
}

function run(
  who: Persona,
  item: Product,
  extra: { routines?: Routine[]; products?: Product[]; analysis?: ProfileAnalysis } = {},
): ScanResult {
  return analyzeProduct({
    id: 'scan-1',
    product: item,
    profile: who.profile,
    analysis: extra.analysis ?? who.analysis,
    routines: extra.routines ?? [],
    products: extra.products ?? [],
    content: inciContent,
    now: NOW,
  });
}

const kinds = (result: ScanResult) => result.warnings.map((warning) => warning.kind);
const limits = (result: ScanResult) => result.insufficientInfo.map((entry) => entry.key);

describe('analyzeProduct: the plan examples', () => {
  it('F1 + T2: "may fit", the limits say that concentrations are unknown, no alcohol warning', () => {
    const f1 = product('f1', compositions.F1);
    const result = run(T2, f1);
    expect(result.status).toBe('may_fit');
    expect(result.warnings).toEqual([]);
    expect(limits(result)).toContain('concentrations_unknown');
    expect(limits(result)).toContain('no_guarantee');
    expect(result.unknown).toEqual([]);
    expect(result.coverage.isSufficient).toBe(true);
    // Cetearyl Alcohol is a fatty alcohol: not a "drying alcohol" even for a person who avoids alcohol
    const avoidsAlcohol = {
      ...T2.analysis,
      restrictions: { ...T2.analysis.restrictions, avoid: ['alcohol' as const] },
    };
    const again = run(T2, f1, { analysis: avoidsAlcohol });
    expect(again.warnings.filter((warning) => warning.kind === 'preference_mismatch')).toEqual([]);
    expect(again.status).toBe('may_fit');
  });

  it('F2 + T2: personal warnings; the reasons go reaction, condition, wish', () => {
    const result = run(T2, product('f2', compositions.F2));
    expect(result.status).toBe('personal_warnings');
    expect(kinds(result)).toEqual([
      'personal_restriction',
      'ingredient_caution',
      'preference_mismatch',
    ]);
    const [reaction, condition, wish] = result.warnings;
    expect(reaction).toMatchObject({
      via: 'group',
      key: 'acids',
      ingredientIds: ['glycolic-acid'],
      possible: false,
    });
    expect(condition).toMatchObject({ ingredientIds: ['glycolic-acid'], key: '0' });
    expect(wish).toMatchObject({ key: 'fragrance_essential_oils', groupIds: ['fragrance'] });
    expect(wish?.ingredientIds).toEqual(['parfum', 'limonene', 'linalool']);
  });

  it('F3 + T2: "not enough information"', () => {
    const result = run(T2, product('f3', compositions.F3));
    expect(result.status).toBe('insufficient_info');
    expect(result.warnings).toEqual([]);
    expect(limits(result)).toEqual(
      expect.arrayContaining(['low_coverage', 'concentrations_unknown', 'no_guarantee']),
    );
  });

  it('a short composition with an acid still gives personal warnings: restrictions outrank missing data', () => {
    const result = run(T2, product('acid', 'Aqua, Glycolic Acid'));
    expect(result.coverage.isSufficient).toBe(false);
    expect(result.status).toBe('personal_warnings');
    expect(limits(result)).toContain('low_coverage');
  });

  it('F4 + T1: "may fit"; the fuzzy match is only "possible" and is not counted', () => {
    const result = run(T1, product('f4', compositions.F4));
    expect(result.status).toBe('may_fit');
    const fuzzy = result.matched.find((entry) => entry.raw === 'Niacinamlde');
    expect(fuzzy).toMatchObject({
      matchType: 'fuzzy',
      ingredientId: 'niacinamide',
      confirmed: false,
    });
    expect(limits(result)).toContain('possible_matches');
    expect(result.coverage.recognized).toBe(5);
    // the benefit of niacinamide is not shown until the match is confirmed
    expect(result.benefits).toEqual([]);

    const confirmed = product('f4c', compositions.F4);
    confirmed.ingredients = confirmed.ingredients.map((item) => ({ ...item, confirmed: true }));
    const after = run(T1, confirmed);
    expect(after.benefits).toEqual(
      expect.arrayContaining([
        { ingredientId: 'niacinamide', goal: 'reduce_oiliness' },
        { ingredientId: 'niacinamide', goal: 'reduce_breakouts' },
      ]),
    );
    expect(limits(after)).not.toContain('possible_matches');
  });

  it('a possible match of an ingredient the person reacts to still warns, marked "possible"', () => {
    const marked = persona(PERSONAS.T1, { reactionIngredients: ['niacinamide'] });
    const result = run(marked, product('f4', compositions.F4));
    expect(result.status).toBe('personal_warnings');
    expect(result.warnings[0]).toMatchObject({
      kind: 'personal_restriction',
      via: 'ingredient',
      ingredientIds: ['niacinamide'],
      possible: true,
    });
  });
});

describe('analyzeProduct: known personal restrictions (scenario 4)', () => {
  it('an ingredient marked on a product card warns on the next product that has it', () => {
    const marked = persona(PERSONAS.T1, { reactionIngredients: ['niacinamide'] });
    const result = run(marked, product('f7', compositions.F7));
    expect(result.status).toBe('personal_warnings');
    expect(result.warnings[0]).toMatchObject({
      kind: 'personal_restriction',
      via: 'ingredient',
      ingredientIds: ['niacinamide'],
      possible: false,
    });
  });

  it('the free text of "Other" is matched by name and alias, and does not repeat a marked ingredient', () => {
    const typed = persona(PERSONAS.T1, {
      reactionOtherText: 'Vitamin B3, Glycerol',
      reactionIngredients: ['niacinamide'],
    });
    const result = run(typed, product('f7', compositions.F7));
    const restrictions = result.warnings.filter(
      (warning) => warning.kind === 'personal_restriction',
    );
    expect(restrictions.map((warning) => [warning.via, warning.ingredientIds])).toEqual([
      ['ingredient', ['niacinamide']],
      ['text', ['glycerin']],
    ]);
  });

  it('a person with no known reactions gets no restriction from an acid', () => {
    const result = run(T1, product('f2', compositions.F2));
    expect(kinds(result)).not.toContain('personal_restriction');
    expect(result.status).toBe('may_fit');
  });

  it('a medical note gives a neutral doctor note, changes no status and names no ingredient', () => {
    const noted = {
      ...T1.analysis,
      restrictions: {
        ...T1.analysis.restrictions,
        medicalNotes: ['pregnancy_or_planning' as const],
      },
    };
    const result = run(T1, product('f1', compositions.F1), { analysis: noted });
    expect(result.status).toBe('may_fit');
    expect(result.warnings).toEqual([
      expect.objectContaining({
        kind: 'doctor_note',
        key: 'pregnancy_or_planning',
        ingredientIds: [],
      }),
    ]);
  });
});

describe('analyzeProduct: no composition (scenario 5)', () => {
  it('a product with only a name needs a composition and nothing is invented', () => {
    const bare = product('bare', '');
    expect(needsComposition(bare)).toBe(true);
    const result = run(T2, bare);
    expect(result.status).toBe('insufficient_info');
    expect(result.matched).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.benefits).toEqual([]);
    expect(limits(result)).toEqual(['no_composition', 'no_guarantee']);
  });

  it('a product saved with the raw text only is parsed during the check', () => {
    const legacy = { ...product('legacy', compositions.F2), ingredients: [] };
    expect(needsComposition(legacy)).toBe(false);
    const result = run(T2, legacy);
    expect(result.status).toBe('personal_warnings');
    expect(result.productSnapshot.ingredients.length).toBe(7);
  });
});

describe('analyzeProduct: the routine (T7)', () => {
  const cleanser = product('cleanser', 'Aqua, Glycerin, Panthenol, Allantoin, Squalane', {
    category: 'cleanser',
  });
  const toner = product('toner', 'Aqua, Glycerin, Glycolic Acid, Lactic Acid, Panthenol', {
    category: 'toner_essence',
  });
  const serum = product('serum', 'Aqua, Glycerin, Retinol, Squalane, Tocopherol', {
    category: 'serum',
  });
  const cream = product('cream', 'Aqua, Glycerin, Parfum, Squalane, Ceramide NP', {
    category: 'moisturizer',
  });
  const everything = [cleanser, toner, serum, cream];
  const routines = routineOf(['am', cleanser, cream], ['pm', cleanser, toner, serum, cream]);

  it('a retinoid next to the evening acid toner: a conflict, raised for a sensitive profile', () => {
    const fresh = product('retinoid2', 'Aqua, Glycerin, Retinol, Squalane, Panthenol', {
      slot: 'pm',
    });
    const result = run(T7P, fresh, { routines, products: everything });
    const conflicts = result.warnings.filter((warning) => warning.kind === 'conflict');
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.every((warning) => warning.productIds.join() === 'p-toner')).toBe(true);
    expect(conflicts[0]).toMatchObject({ key: 'not_recommended_for_profile', slot: 'pm' });
    expect(result.status).toBe('caution');
  });

  it('the same retinoid in the morning does not meet an evening-only rule', () => {
    const fresh = product('retinoid-am', 'Aqua, Glycerin, Retinol, Squalane, Panthenol', {
      slot: 'am',
    });
    const result = run(T7P, fresh, { routines, products: everything });
    expect(kinds(result)).not.toContain('conflict');
  });

  it('a product is never checked against itself', () => {
    const result = run(T7P, serum, { routines, products: everything });
    expect(result.warnings.filter((warning) => warning.productIds.includes('p-serum'))).toEqual([]);
  });

  it('a second acid product repeats the active group of the toner', () => {
    const second = product('acid2', 'Aqua, Glycerin, Lactic Acid, Panthenol, Allantoin', {
      slot: 'pm',
    });
    const result = run(T7P, second, { routines, products: everything });
    const duplicates = result.warnings.filter((warning) => warning.kind === 'duplicate_active');
    expect(duplicates.map((warning) => warning.groupIds[0]).sort()).toEqual(['acids', 'aha']);
    expect(duplicates[0]?.productIds).toEqual(['p-toner']);
  });

  it('a group the content does not mark as active is not a duplicate (fragrance)', () => {
    const scented = product('scented', 'Aqua, Glycerin, Parfum, Squalane, Panthenol');
    const result = run(T7P, scented, { routines, products: everything });
    expect(kinds(result)).not.toContain('duplicate_active');
    // T7 asked to avoid fragrance: that is a wish, and it makes the status "caution"
    expect(kinds(result)).toContain('preference_mismatch');
    expect(result.status).toBe('caution');
  });

  it('a routine step whose product is not in the collection is ignored', () => {
    const ghost = routineOf(['pm', { ...serum, id: 'p-missing' }]);
    const result = run(T7P, toner, { routines: ghost, products: [] });
    expect(kinds(result)).not.toContain('conflict');
  });
});

describe('analyzeProduct: the result as data', () => {
  const cases: [string, Persona, string][] = [
    ['F1 T2', T2, compositions.F1],
    ['F2 T2', T2, compositions.F2],
    ['F3 T2', T2, compositions.F3],
    ['F4 T1', T1, compositions.F4],
    ['F5 T1', T1, compositions.F5],
    ['F6 T1', T1, compositions.F6],
    ['F7 T7', T7P, compositions.F7],
  ];

  it.each(cases)(
    '%s: the result passes the schema, has unique ids and the profile revision',
    (_name, who, text) => {
      const result = run(who, product('x', text));
      expect(scanResultSchema.safeParse(result).success).toBe(true);
      const ids = [...result.warnings, ...result.insufficientInfo].map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(result.profileRevision).toBe(IDENTITY.revision);
      expect(result.checkedAt).toBe('2026-01-05T12:00:00.000Z');
      // "no_guarantee" is on every result
      expect(limits(result)).toContain('no_guarantee');
    },
  );

  it('is deterministic: the same input gives the same result', () => {
    const item = product('f2', compositions.F2);
    expect(run(T2, item)).toEqual(run(T2, item));
  });

  it('F7 declares a concentration: it is a claim of the label, not checked', () => {
    const result = run(
      T1,
      product('f7', compositions.F7, { declaredConcentrations: [{ raw: '5%', percent: 5 }] }),
    );
    expect(limits(result)).toContain('concentrations_declared');
    expect(limits(result)).not.toContain('concentrations_unknown');
  });

  it('counts the unknown positions and keeps their text', () => {
    const result = run(
      T1,
      product('odd', 'Aqua, Glycerin, Panthenol, Squalane, Allantoin, Mystery Extract'),
    );
    expect(result.unknown).toEqual(['Mystery Extract']);
    expect(limits(result)).toContain('unrecognized_items');
    expect(result.status).toBe('may_fit');
  });
});
