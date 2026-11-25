import { describe, expect, it } from 'vitest';
import { OBSERVATION_TEMPLATE_IDS, routineObservationSchema } from '@/schemas';
import { createRealContent } from '@/test/helpers/fakes';
import { inciContent } from '@/test/data/inciFixtures';
import { PERSONAS } from '@/test/data/personas';
import type { Product, ProductCategory, Routine, SkinProfile, TestAnswers } from '@/types';
import { prepareComposition } from '../../analyze';
import { DEFAULT_ROUTINE_CONFIG } from '../../config';
import { buildProfile, type ProfileAnalysis } from '../../profile';
import { analyzeRoutine } from '../analyzeRoutine';
import { attachProduct } from '../attachProduct';
import { buildBaseRoutine } from '../buildBaseRoutine';
import { fillTemplate } from '../fillTemplate';
import { categoriesInSlots, routineProducts } from '../routineProducts';

const NOW = Date.UTC(2026, 0, 5, 12);
const IDENTITY = { id: 'profile-1', revision: 1, createdAt: '2026-01-01T12:00:00.000Z' };
const realContent = createRealContent('demo');

type Persona = { profile: SkinProfile; analysis: ProfileAnalysis };
const persona = (answers: TestAnswers): Persona => {
  const built = buildProfile(answers, realContent.bundle, NOW, IDENTITY);
  return { profile: built.profile, analysis: built.analysis };
};
const T1 = persona(PERSONAS.T1);
const T2 = persona(PERSONAS.T2);
const T7 = persona(PERSONAS.T7);
const T8 = persona(PERSONAS.T8);

const BASE = 'Aqua, Glycerin, Panthenol, Allantoin, Squalane';

function product(name: string, category: ProductCategory, text: string): Product {
  const prepared = prepareComposition(text, inciContent);
  return {
    id: `p-${name}`,
    name,
    category,
    inciRaw: text,
    ingredients: prepared.ingredients,
    compositionSource: 'pasted',
    userReactions: [],
    addedAt: '2026-01-02T10:00:00.000Z',
  };
}

/** The base routine of the persona with the products attached the way the screens attach them. */
function routinesOf(
  who: Persona,
  placement: { am?: Product[]; pm?: Product[] },
  ownedCategories: ProductCategory[] = [],
): Routine[] {
  const built = buildBaseRoutine(
    who.profile,
    who.analysis,
    ownedCategories,
    realContent.bundle,
  ).routines;
  return built.map((routine) =>
    (placement[routine.slot] ?? []).reduce(
      (current, item, index) =>
        attachProduct(current, item, `added-${routine.slot}-${index}`, 'daily'),
      routine,
    ),
  );
}

const run = (
  who: Persona,
  routines: Routine[],
  products: Product[],
  config = DEFAULT_ROUTINE_CONFIG,
) => analyzeRoutine(routines, products, who.profile, who.analysis, inciContent, config);

const kinds = (list: ReturnType<typeof run>) => list.map((entry) => entry.kind);

const hasNumber = (value: unknown): boolean => {
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.some(hasNumber);
  if (value !== null && typeof value === 'object') return Object.values(value).some(hasNumber);
  return false;
};

// Persona T7 (plan, section 5): (1) a cleanser without actives, morning and evening; (2) an AHA
// toner, evening; (3) a retinoid serum, evening; (4) a moisturizer with Parfum, morning and
// evening. There is no sunscreen.
const cleanser = product('cleanser', 'cleanser', BASE);
const toner = product(
  'toner',
  'toner_essence',
  'Aqua, Glycerin, Glycolic Acid, Lactic Acid, Panthenol',
);
const serum = product('serum', 'serum', 'Aqua, Glycerin, Retinol, Squalane, Tocopherol');
const cream = product('cream', 'moisturizer', 'Aqua, Glycerin, Parfum, Squalane, Ceramide NP');
const T7_PRODUCTS = [cleanser, toner, serum, cream];
const T7_ROUTINES = routinesOf(T7, { am: [cleanser, cream], pm: [cleanser, toner, serum, cream] });

describe('analyzeRoutine: persona T7', () => {
  const result = run(T7, T7_ROUTINES, T7_PRODUCTS);

  it('gives the observations in the order of the plan', () => {
    expect(kinds(result)).toEqual([
      'conflict',
      'many_actives_in_slot',
      'missing_base_step',
      'preference_mismatch',
    ]);
  });

  it('the retinoid and the AHA in the evening: a conflict raised by the sensitive skin', () => {
    const conflict = result[0];
    expect(conflict).toMatchObject({
      kind: 'conflict',
      severity: 'important',
      templateId: OBSERVATION_TEMPLATE_IDS.conflict,
      relatedProductIds: ['p-toner', 'p-serum'],
    });
    expect(conflict?.params['slots']).toEqual(['pm']);
    expect(conflict?.params['conditions']).toContain('sensitive');
    expect(conflict?.ruleId).toMatch(/^r-/);
  });

  it('two active products in the evening: many actives, with the text of the sensitive skin', () => {
    expect(result[1]).toMatchObject({
      kind: 'many_actives_in_slot',
      templateId: OBSERVATION_TEMPLATE_IDS.manyActivesSensitive,
      relatedProductIds: ['p-toner', 'p-serum'],
    });
    expect(result[1]?.params['slots']).toEqual(['pm']);
  });

  it('no sunscreen in the morning: one observation, only for the morning', () => {
    expect(result[2]).toMatchObject({
      kind: 'missing_base_step',
      templateId: OBSERVATION_TEMPLATE_IDS.missingSunscreen,
      relatedProductIds: [],
    });
    expect(result[2]?.params).toEqual({ slots: ['am'], categories: ['sunscreen'] });
  });

  it('the fragrance in the moisturizer: one wish observation for the morning and the evening', () => {
    expect(result[3]).toMatchObject({
      kind: 'preference_mismatch',
      templateId: OBSERVATION_TEMPLATE_IDS.preferenceMismatch,
      relatedProductIds: ['p-cream'],
    });
    expect(result[3]?.params['slots']).toEqual(['am', 'pm']);
    expect(result[3]?.params['keys']).toEqual(['fragrance_essential_oils']);
    expect(result[3]?.params['groups']).toEqual(['fragrance']);
  });

  it('has no duplicated active: each active group stands in one product only', () => {
    expect(kinds(result)).not.toContain('duplicate_active');
  });

  it('is data without numbers: it passes the schema, ids are unique, no value is a number', () => {
    for (const entry of result)
      expect(routineObservationSchema.safeParse(entry).success).toBe(true);
    expect(new Set(result.map((entry) => entry.id)).size).toBe(result.length);
    expect(JSON.stringify(result)).not.toMatch(/score|percent|rating/i);
    expect(hasNumber(result)).toBe(false);
  });

  it('is deterministic', () => {
    expect(run(T7, T7_ROUTINES, T7_PRODUCTS)).toEqual(result);
  });

  it('removing the serum removes the conflict and the many-actives observation', () => {
    const without = routinesOf(T7, { am: [cleanser, cream], pm: [cleanser, toner, cream] });
    expect(kinds(run(T7, without, T7_PRODUCTS))).toEqual([
      'missing_base_step',
      'preference_mismatch',
    ]);
  });

  it('a conflict is not raised to "important" for a profile without sensitive skin', () => {
    const calm = persona({ ...PERSONAS.T7, q2_conditions: ['breakouts'] });
    const conflict = run(calm, routinesOf(calm, { pm: [toner, serum] }), T7_PRODUCTS).find(
      (entry) => entry.kind === 'conflict',
    );
    expect(conflict?.severity).toBe('attention');
    expect(conflict?.params['conditions']).toEqual([]);
  });
});

describe('analyzeRoutine: an empty routine', () => {
  it('no routine at all: an empty list, not an error', () => {
    expect(run(T7, [], [])).toEqual([]);
  });

  it('a routine with no products: an empty list, even with products in the collection', () => {
    const routines = routinesOf(T1, {});
    expect(run(T1, routines, T7_PRODUCTS)).toEqual([]);
  });

  it('a step that points to a product that is not in the collection is ignored', () => {
    const routines = routinesOf(T1, { pm: [toner] });
    expect(run(T1, routines, [])).toEqual([]);
  });
});

describe('analyzeRoutine: only some of the products (the mixed scenario)', () => {
  it('shows the missing steps and does not ask for the full set', () => {
    const result = run(T1, routinesOf(T1, { pm: [cleanser] }), [cleanser]);
    expect(kinds(result)).toEqual(['missing_base_step', 'missing_base_step']);
    const missing = result.map((entry) => entry.params['categories']?.[0]).sort();
    expect(missing).toEqual(['moisturizer', 'sunscreen']);
    // the moisturizer is missing in the morning and in the evening: one observation
    const moisturizer = result.find((entry) => entry.params['categories']?.[0] === 'moisturizer');
    expect(moisturizer?.params['slots']).toEqual(['am', 'pm']);
    expect(result.every((entry) => entry.severity === 'info')).toBe(true);
  });

  it('shows the present problems together with the missing steps', () => {
    const result = run(T7, routinesOf(T7, { pm: [toner, serum] }), [toner, serum]);
    expect(kinds(result)).toEqual([
      'conflict',
      'many_actives_in_slot',
      'missing_base_step',
      'missing_base_step',
      'missing_base_step',
    ]);
  });

  it('the morning cleanser is "if needed", so it is never asked for', () => {
    const result = run(T1, routinesOf(T1, { am: [cream], pm: [cleanser, cream] }), [
      cleanser,
      cream,
    ]);
    expect(result.map((entry) => entry.params['categories'])).toEqual([['sunscreen']]);
  });

  it('a step the person marked as owned counts as present, even with no product added', () => {
    const routines = routinesOf(T1, { pm: [cleanser, cream] }, ['sunscreen']);
    const result = run(T1, routines, [cleanser, cream]);
    expect(
      result.find((entry) => entry.params['categories']?.includes('sunscreen')),
    ).toBeUndefined();
  });
});

describe('analyzeRoutine: the other kinds', () => {
  it('a reaction to acids: the personal restriction comes first', () => {
    const result = run(T2, routinesOf(T2, { pm: [cleanser, toner, cream] }), [
      cleanser,
      toner,
      cream,
    ]);
    expect(result[0]).toMatchObject({ kind: 'personal_restriction', severity: 'important' });
    expect(result[0]?.params['keys']).toEqual(['acids']);
    expect(result[0]?.relatedProductIds).toEqual(['p-toner']);
    expect(kinds(result).indexOf('personal_restriction')).toBeLessThan(
      kinds(result).indexOf('missing_base_step'),
    );
  });

  it('two products with the same active groups: one duplicate observation with both groups', () => {
    const second = product(
      'second-acid',
      'serum',
      'Aqua, Glycerin, Lactic Acid, Panthenol, Allantoin',
    );
    const result = run(T1, routinesOf(T1, { pm: [cleanser, toner, second, cream] }), [
      cleanser,
      toner,
      second,
      cream,
    ]);
    const duplicates = result.filter((entry) => entry.kind === 'duplicate_active');
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.params['groups']?.slice().sort()).toEqual(['acids', 'aha']);
    expect(duplicates[0]?.params['slots']).toEqual(['pm']);
    expect(duplicates[0]?.relatedProductIds).toEqual(['p-toner', 'p-second-acid']);
  });

  it('the same active group in the morning and in the evening is a duplicate with no common slot', () => {
    const second = product(
      'second-acid',
      'serum',
      'Aqua, Glycerin, Lactic Acid, Panthenol, Allantoin',
    );
    const result = run(T1, routinesOf(T1, { am: [second], pm: [toner] }), [toner, second]);
    const duplicate = result.find((entry) => entry.kind === 'duplicate_active');
    expect(duplicate?.params['slots']).toEqual([]);
  });

  it('products without a composition, or with a poor one, are listed as incomplete data', () => {
    const empty: Product = {
      ...product('empty', 'serum', ''),
      ingredients: [],
      inciRaw: '',
      compositionSource: 'unknown',
    };
    const poor = product('poor', 'toner_essence', 'Aqua, Mystery One, Mystery Two');
    const result = run(T1, routinesOf(T1, { pm: [cleanser, empty, poor] }), [
      cleanser,
      empty,
      poor,
    ]);
    const incomplete = result.filter((entry) => entry.kind === 'incomplete_data');
    expect(incomplete.map((entry) => entry.templateId).sort()).toEqual([
      OBSERVATION_TEMPLATE_IDS.incompleteLowCoverage,
      OBSERVATION_TEMPLATE_IDS.incompleteNoComposition,
    ]);
    expect(
      incomplete.find((entry) => entry.params['keys']?.includes('no_composition'))
        ?.relatedProductIds,
    ).toEqual(['p-empty']);
  });

  it('a prescription and a pregnancy: doctor notes, the last in the list', () => {
    const result = run(T8, routinesOf(T8, { pm: [cleanser, cream] }), [cleanser, cream]);
    const notes = result.filter((entry) => entry.kind === 'doctor_note');
    expect(notes.map((entry) => entry.params['keys']?.[0]).sort()).toEqual([
      'pregnancy_or_planning',
      'prescribed_derm_treatment',
    ]);
    expect(result[result.length - 1]?.kind).toBe('doctor_note');
  });

  it('the "many actives" threshold is a setting, not a medical rule', () => {
    const strict = { ...DEFAULT_ROUTINE_CONFIG, manyActivesInSlot: 3 };
    expect(kinds(run(T7, T7_ROUTINES, T7_PRODUCTS, strict))).not.toContain('many_actives_in_slot');
    const loose = { ...DEFAULT_ROUTINE_CONFIG, manyActivesInSlot: 1 };
    const result = run(T7, T7_ROUTINES, T7_PRODUCTS, loose);
    expect(result.filter((entry) => entry.kind === 'many_actives_in_slot').length).toBeGreaterThan(
      0,
    );
  });

  it('the words for "many actives" depend on the sensitive skin, nothing else', () => {
    const calm = persona({ ...PERSONAS.T7, q2_conditions: ['breakouts'] });
    const result = run(calm, routinesOf(calm, { pm: [toner, serum] }), [toner, serum]);
    expect(result.find((entry) => entry.kind === 'many_actives_in_slot')?.templateId).toBe(
      OBSERVATION_TEMPLATE_IDS.manyActives,
    );
  });

  it('nothing is guessed: with no group marked as active, only an "exfoliant" counts as active', () => {
    const unmarked = {
      ...inciContent,
      ingredientGroups: inciContent.ingredientGroups.map((group) => ({ ...group, active: false })),
    };
    const scrub = product('scrub', 'exfoliant', 'Aqua, Glycerin, Panthenol, Allantoin, Squalane');
    const routines = routinesOf(T7, { pm: [toner, serum, scrub] });
    const both = analyzeRoutine(routines, [toner, serum, scrub], T7.profile, T7.analysis, unmarked);
    // the toner and the serum are not "active" for the content; one exfoliant is not "many"
    expect(kinds(both)).not.toContain('many_actives_in_slot');
    expect(kinds(both)).not.toContain('duplicate_active');
    const two = product('scrub2', 'exfoliant', 'Aqua, Glycerin, Panthenol, Allantoin, Squalane');
    const pair = analyzeRoutine(
      routinesOf(T7, { pm: [scrub, two] }),
      [scrub, two],
      T7.profile,
      T7.analysis,
      unmarked,
    );
    expect(kinds(pair)).toContain('many_actives_in_slot');
  });

  it('a fuzzy match nobody confirmed is not a basis for a personal observation', () => {
    const unsure = product(
      'unsure',
      'toner_essence',
      'Aqua, Glycerin, Glicolic Acid, Panthenol, Allantoin, Squalane',
    );
    expect(unsure.ingredients.some((item) => item.matchType === 'fuzzy' && !item.confirmed)).toBe(
      true,
    );
    const result = run(T2, routinesOf(T2, { pm: [cleanser, unsure, cream] }), [
      cleanser,
      unsure,
      cream,
    ]);
    expect(kinds(result)).not.toContain('personal_restriction');
  });
});

describe('analyzeRoutine: with the real content', () => {
  it('with no rules and no active groups in the real content only the missing steps and notes remain', () => {
    const real = realContent.bundle;
    const result = analyzeRoutine(T7_ROUTINES, T7_PRODUCTS, T7.profile, T7.analysis, real);
    expect(kinds(result)).not.toContain('conflict');
    expect(kinds(result)).not.toContain('duplicate_active');
    expect(kinds(result)).not.toContain('many_actives_in_slot');
    expect(kinds(result)).toContain('missing_base_step');
  });
});

describe('routineProducts and categoriesInSlots', () => {
  it('lists each product once, morning first, with its slots', () => {
    const entries = routineProducts(T7_ROUTINES, T7_PRODUCTS);
    expect(entries.map((entry) => entry.product.id)).toEqual([
      'p-cleanser',
      'p-cream',
      'p-toner',
      'p-serum',
    ]);
    expect(entries.find((entry) => entry.product.id === 'p-cream')?.slots).toEqual(['am', 'pm']);
    expect(entries.find((entry) => entry.product.id === 'p-serum')?.slots).toEqual(['pm']);
  });

  it('knows which categories stand in each slot', () => {
    const present = categoriesInSlots(T7_ROUTINES, T7_PRODUCTS);
    expect(present.am.has('sunscreen')).toBe(false);
    expect(present.am.has('moisturizer')).toBe(true);
    expect(present.pm.has('cleanser')).toBe(true);
  });
});

describe('fillTemplate', () => {
  it('puts the values in', () => {
    expect(fillTemplate('Засоби: {products}.', { products: 'A, B' })).toBe('Засоби: A, B.');
  });

  it('leaves a placeholder with no value as it is', () => {
    expect(fillTemplate('{products} і {other}', { products: 'A' })).toBe('A і {other}');
  });

  it('changes nothing in a text with no placeholders', () => {
    const text = 'У твоїй ранковій рутині не зазначено сонцезахисний засіб.';
    expect(fillTemplate(text, { products: 'A' })).toBe(text);
  });
});
