import { describe, expect, it } from 'vitest';
import { buildProfile } from '../profile';
import { createRealContent } from '@/test/fakes';
import { PERSONAS } from '@/test/personas';
import {
  BASE_INFOS,
  OPT_ACID,
  OPT_ANTI_AGE,
  OPT_BREAKOUTS,
  OPT_HYDRATE_AM,
  routineContent,
  stepInfo,
} from '@/test/routineContent';
import type { ContentBundle, ProductCategory, TestAnswers } from '@/types';
import { buildBaseRoutine, buildShoppingNeeds, explainStep } from './index';

const NOW = Date.UTC(2026, 0, 1, 12);
const IDENTITY = { id: 'profile-1', revision: 1, createdAt: '2026-01-01T12:00:00.000Z' };

const ALL = routineContent([OPT_BREAKOUTS, OPT_ANTI_AGE, OPT_HYDRATE_AM, OPT_ACID, ...BASE_INFOS]);

function analyze(answers: TestAnswers, content: ContentBundle = ALL) {
  return { content, ...buildProfile(answers, content, NOW, IDENTITY) };
}

function routineOf(answers: TestAnswers, owned: ProductCategory[] = [], content = ALL) {
  const { profile, analysis } = analyze(answers, content);
  const built = buildBaseRoutine(profile, analysis, owned, content);
  const [am, pm] = built.routines;
  if (!am || !pm) throw new Error('two routines expected');
  return { ...built, am, pm, profile, analysis, content };
}

const categories = (steps: { category: string }[]) => steps.map((step) => step.category);
const optionals = (steps: { status: string }[]) =>
  steps.filter((step) => step.status === 'optional');

describe('buildBaseRoutine: personas', () => {
  it('T1: morning of 3 base steps, evening of 2 and exactly 1 optional step', () => {
    const { am, pm } = routineOf(PERSONAS.T1);
    expect(categories(am.steps)).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
    expect(categories(pm.steps)).toEqual(['cleanser', 'moisturizer', 'serum']);
    expect(optionals(am.steps)).toHaveLength(0);
    expect(optionals(pm.steps)).toHaveLength(1);
    expect(pm.steps[2]).toMatchObject({
      status: 'optional',
      contentId: 'opt-breakouts',
      frequency: 'one_two_per_week',
    });
  });

  it('the morning cleanser is "as needed", the other base steps are daily', () => {
    const { am, pm } = routineOf(PERSONAS.T1);
    expect(am.steps.map((step) => step.frequency)).toEqual(['as_needed', 'daily', 'daily']);
    expect(pm.steps.slice(0, 2).map((step) => step.frequency)).toEqual(['daily', 'daily']);
  });

  it('T2: morning 3, evening 2, no optional step, warnings carry acids and fragrance', () => {
    const { am, pm, analysis, content } = routineOf(PERSONAS.T2);
    expect(am.steps).toHaveLength(3);
    expect(pm.steps).toHaveLength(2);
    expect(optionals([...am.steps, ...pm.steps])).toHaveLength(0);
    const first = am.steps[0];
    if (!first) throw new Error('a step is expected');
    const { personalWarnings } = explainStep(first, 'am', analysis, content);
    expect(personalWarnings).toContainEqual({ kind: 'reaction', key: 'acids' });
    expect(personalWarnings).toContainEqual({ kind: 'avoid', key: 'fragrance_essential_oils' });
  });

  it.each(['T5a', 'T5b'] as const)('%s: no optional step', (name) => {
    const { am, pm, notes } = routineOf(PERSONAS[name]);
    expect(optionals([...am.steps, ...pm.steps])).toHaveLength(0);
    expect(notes).toContain('no_extra_steps');
  });

  it('T5b: the mode is "emergency" and the base routine is still built', () => {
    const { analysis, am, pm } = routineOf(PERSONAS.T5b);
    expect(analysis.mode).toBe('emergency');
    expect(am.steps).toHaveLength(3);
    expect(pm.steps).toHaveLength(2);
  });

  it('T6: no anti-age step for a minor', () => {
    const { am, pm } = routineOf(PERSONAS.T6);
    const all = [...am.steps, ...pm.steps];
    expect(all.some((step) => step.contentId === 'opt-anti-age')).toBe(false);
    // the other goal still works: the breakouts step is offered
    expect(all.some((step) => step.contentId === 'opt-breakouts')).toBe(true);
  });

  it('the same anti-age goal does bring the step to an adult', () => {
    const adult = { ...PERSONAS.T6, q10_age_band: '25_34', q1_base_type: 'normal' } as TestAnswers;
    const { pm } = routineOf({ ...adult, q3_goals: ['anti_aging'] });
    expect(pm.steps.some((step) => step.contentId === 'opt-anti-age')).toBe(true);
  });

  it("T8: a prescription means no active steps and a note about the doctor's scheme", () => {
    const { am, pm, notes } = routineOf(PERSONAS.T8);
    expect(optionals([...am.steps, ...pm.steps])).toHaveLength(0);
    expect(notes).toContain('follow_doctor_scheme');
    expect(notes).toContain('no_extra_steps');
  });

  it('T3 and T4: only base steps (no candidate matches their goals)', () => {
    for (const name of ['T3', 'T4'] as const) {
      const { am, pm } = routineOf(PERSONAS[name]);
      expect(optionals([...am.steps, ...pm.steps])).toHaveLength(0);
    }
  });

  it('there is no note for a standard profile', () => {
    expect(routineOf(PERSONAS.T1).notes).toEqual([]);
  });
});

describe('buildBaseRoutine: rules', () => {
  it('sunscreen is always in the morning and never in the evening', () => {
    for (const answers of Object.values(PERSONAS)) {
      const { am, pm } = routineOf(answers);
      expect(categories(am.steps)).toContain('sunscreen');
      expect(categories(pm.steps)).not.toContain('sunscreen');
    }
  });

  it('toners, essences and serums are never required: they are only "optional"', () => {
    for (const answers of Object.values(PERSONAS)) {
      const { am, pm } = routineOf(answers);
      for (const step of [...am.steps, ...pm.steps]) {
        if (['serum', 'toner_essence', 'exfoliant'].includes(step.category)) {
          expect(step.status).toBe('optional');
        }
      }
    }
  });

  it('a candidate that clashes with a reaction is not offered, with no restriction it is', () => {
    const base: TestAnswers = {
      q1_base_type: 'oily',
      q2_conditions: ['breakouts'],
      q3_goals: ['reduce_breakouts'],
      q4_reactions: ['none_noticed'],
    };
    const only = routineContent([OPT_ACID]);
    expect(routineOf(base, [], only).pm.steps.some((s) => s.contentId === 'opt-acid')).toBe(true);
    const withReaction = routineOf({ ...base, q4_reactions: ['acids'] }, [], only);
    expect(withReaction.analysis.mode).toBe('standard');
    expect(withReaction.pm.steps.some((s) => s.contentId === 'opt-acid')).toBe(false);
  });

  it('a wish to avoid something removes a candidate with that tag', () => {
    const content = routineContent([
      stepInfo({
        id: 'opt-fragrance',
        goals: ['hydrate'],
        avoidTags: ['fragrance_essential_oils'],
      }),
    ]);
    const answers: TestAnswers = { q1_base_type: 'dry', q3_goals: ['hydrate'], q5_avoid: ['none'] };
    expect(
      routineOf(answers, [], content).pm.steps.some((s) => s.contentId === 'opt-fragrance'),
    ).toBe(true);
    const avoiding = routineOf({ ...answers, q5_avoid: ['fragrance_essential_oils'] }, [], content);
    expect(avoiding.pm.steps.some((s) => s.contentId === 'opt-fragrance')).toBe(false);
  });

  it('at most one optional step in a slot: the candidate with more matching goals wins', () => {
    const content = routineContent([
      stepInfo({ id: 'opt-one', goals: ['hydrate'] }),
      stepInfo({ id: 'opt-two', goals: ['hydrate', 'reduce_oiliness'] }),
    ]);
    const answers: TestAnswers = { q1_base_type: 'oily', q3_goals: ['hydrate', 'reduce_oiliness'] };
    const { pm } = routineOf(answers, [], content);
    expect(optionals(pm.steps)).toHaveLength(1);
    expect(pm.steps.find((step) => step.status === 'optional')?.contentId).toBe('opt-two');
  });

  it('a morning optional step stands before sunscreen, which stays the last step', () => {
    const answers: TestAnswers = {
      q1_base_type: 'dry',
      q2_conditions: ['dehydrated'],
      q3_goals: ['hydrate'],
    };
    const { am } = routineOf(answers);
    expect(categories(am.steps)).toEqual(['cleanser', 'moisturizer', 'toner_essence', 'sunscreen']);
    expect(am.steps.map((step) => step.order)).toEqual([0, 1, 2, 3]);
  });

  it('a candidate without a frequency in the content gets the neutral "as needed"', () => {
    const content = routineContent([
      stepInfo({ id: 'opt-x', goals: ['hydrate'], frequency: null }),
    ]);
    const { pm } = routineOf({ q1_base_type: 'dry', q3_goals: ['hydrate'] }, [], content);
    expect(pm.steps.find((s) => s.contentId === 'opt-x')?.frequency).toBe('as_needed');
  });

  it('ids are stable: the same slot and category always give the same step id', () => {
    const a = routineOf(PERSONAS.T1);
    const b = routineOf({ ...PERSONAS.T1, q6_sex: 'female' });
    expect(a.am.steps.map((s) => s.id)).toEqual(['am-cleanser', 'am-moisturizer', 'am-sunscreen']);
    expect(b.pm.steps.map((s) => s.id)).toEqual(a.pm.steps.map((s) => s.id));
    expect(a.am.id).toBe('routine-am');
    expect(a.pm.id).toBe('routine-pm');
  });

  it('there are no separate routines by sex: only the sex answer differs, the result is the same', () => {
    const male = routineOf({ ...PERSONAS.T2, q6_sex: 'male' });
    const female = routineOf({ ...PERSONAS.T2, q6_sex: 'female', q6_1_cycle: ['not_relevant'] });
    expect(male.routines).toEqual(female.routines);
    expect(male.notes).toEqual(female.notes);
  });

  it('is deterministic and does not change its arguments', () => {
    const { profile, analysis, content } = routineOf(PERSONAS.T1);
    const before = JSON.stringify({ profile, analysis, content });
    const first = buildBaseRoutine(profile, analysis, ['moisturizer'], content);
    const second = buildBaseRoutine(profile, analysis, ['moisturizer'], content);
    expect(first).toEqual(second);
    expect(JSON.stringify({ profile, analysis, content })).toBe(before);
  });

  it('with the real content (no verified candidates) there is no optional step: this is correct', () => {
    const real = createRealContent('demo').bundle;
    for (const answers of Object.values(PERSONAS)) {
      const { am, pm } = routineOf(answers, [], real);
      expect(optionals([...am.steps, ...pm.steps])).toHaveLength(0);
      expect(am.steps).toHaveLength(3);
      expect(pm.steps).toHaveLength(2);
    }
  });
});

describe('scenarios "No", "Yes" and "Partly"', () => {
  it('"No": every base step is still to be chosen', () => {
    const { am, pm } = routineOf(PERSONAS.T1, []);
    expect(
      [...am.steps, ...pm.steps]
        .filter((s) => s.status !== 'optional')
        .every((s) => s.status === 'to_choose'),
    ).toBe(true);
  });

  it('"Partly": the owned category gets "owned" in both routines', () => {
    const { am, pm } = routineOf(PERSONAS.T1, ['moisturizer']);
    expect(am.steps.map((s) => s.status)).toEqual(['to_choose', 'owned', 'to_choose']);
    expect(pm.steps.map((s) => s.status)).toEqual(['to_choose', 'owned', 'optional']);
  });

  it('"Yes": all base categories owned', () => {
    const { am, pm } = routineOf(PERSONAS.T1, ['cleanser', 'moisturizer', 'sunscreen']);
    const statuses = [...am.steps, ...pm.steps]
      .filter((s) => s.status !== 'optional')
      .map((s) => s.status);
    expect(new Set(statuses)).toEqual(new Set(['owned']));
  });

  it('a category that is not a base step changes nothing', () => {
    const plain = routineOf(PERSONAS.T1, []);
    const withSerum = routineOf(PERSONAS.T1, ['serum', 'mask']);
    expect(withSerum.routines).toEqual(plain.routines);
  });
});

describe('explainStep', () => {
  it('without texts in the content: no purpose, no components ("Інформація готується")', () => {
    const { am, analysis } = routineOf(PERSONAS.T1, [], routineContent([]));
    const step = am.steps[0];
    if (!step) throw new Error('a step is expected');
    const result = explainStep(step, 'am', analysis, routineContent([]));
    expect(result).toMatchObject({ timeOfUse: 'am', purposeId: null, componentsToLookFor: [] });
  });

  it('a base step takes the base record of its category and its components', () => {
    const { am, analysis, content } = routineOf(PERSONAS.T1);
    const step = am.steps[0];
    if (!step) throw new Error('a step is expected');
    const result = explainStep(step, 'am', analysis, content);
    expect(result.purposeId).toBe('step-base-cleanser');
    expect(result.componentsToLookFor).toEqual(['group-a']);
  });

  it('an optional step takes its own record', () => {
    const { pm, analysis, content } = routineOf(PERSONAS.T1);
    const optional = pm.steps.find((s) => s.status === 'optional');
    if (!optional) throw new Error('an optional step is expected');
    expect(explainStep(optional, 'pm', analysis, content).purposeId).toBe('opt-breakouts');
  });

  it("the user's own step uses the base record of its category, or nothing", () => {
    const { analysis, content } = routineOf(PERSONAS.T1);
    expect(explainStep({ category: 'moisturizer' }, 'pm', analysis, content).purposeId).toBe(
      'step-base-moisturizer',
    );
    expect(explainStep({ category: 'mask' }, 'pm', analysis, content).purposeId).toBeNull();
  });

  it('T8: the medical notes are among the warnings', () => {
    const { analysis, content } = routineOf(PERSONAS.T8);
    const { personalWarnings } = explainStep({ category: 'cleanser' }, 'am', analysis, content);
    expect(personalWarnings).toContainEqual({ kind: 'medical', key: 'prescribed_derm_treatment' });
    expect(personalWarnings).toContainEqual({ kind: 'medical', key: 'pregnancy_or_planning' });
  });

  it('no warnings for a profile with no restrictions', () => {
    const { analysis, content } = routineOf(PERSONAS.T1);
    expect(explainStep({ category: 'cleanser' }, 'am', analysis, content).personalWarnings).toEqual(
      [],
    );
  });
});

describe('buildShoppingNeeds', () => {
  function needsOf(
    answers: TestAnswers,
    owned: ProductCategory[] = [],
    products: { category: ProductCategory }[] = [],
  ) {
    const { routines, profile, analysis, content } = routineOf(answers, owned);
    return buildShoppingNeeds(routines, products, profile, analysis, content);
  }
  const byPriority = (items: { priority: string; category: string }[], priority: string) =>
    items.filter((item) => item.priority === priority).map((item) => item.category);

  it('T1 from scratch: 3 base items, the optional step, and the rest "not needed now"', () => {
    const items = needsOf(PERSONAS.T1);
    expect(byPriority(items, 'base')).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
    expect(byPriority(items, 'missing')).toEqual([]);
    expect(byPriority(items, 'optional')).toEqual(['serum']);
    const notNow = items.filter((i) => i.priority === 'not_now');
    expect(notNow.map((i) => [i.id, i.reason])).toEqual([
      ['need-opt-anti-age', 'not_in_goals'],
      ['need-opt-hydrate', 'not_in_goals'],
      ['need-opt-acid', 'slot_taken'],
    ]);
  });

  it('"Partly" with a moisturizer: the cleanser and the sunscreen are "missing"', () => {
    const items = needsOf(PERSONAS.T1, ['moisturizer']);
    expect(byPriority(items, 'missing')).toEqual(['cleanser', 'sunscreen']);
    expect(byPriority(items, 'base')).toEqual([]);
    expect(items.some((item) => item.id === 'need-moisturizer')).toBe(false);
  });

  it('a product of the user in a category removes that need', () => {
    const items = needsOf(PERSONAS.T1, [], [{ category: 'cleanser' }]);
    expect(byPriority(items, 'missing')).toEqual(['moisturizer', 'sunscreen']);
  });

  it('T2: base items, nothing optional, the candidates stand under "not needed now" for the mode', () => {
    const items = needsOf(PERSONAS.T2);
    expect(byPriority(items, 'base')).toHaveLength(3);
    expect(byPriority(items, 'optional')).toEqual([]);
    const notNow = items.filter((i) => i.priority === 'not_now');
    expect(notNow.length).toBeGreaterThan(0);
    expect(notNow.every((i) => i.reason === 'mode')).toBe(true);
  });

  it('T8: the reason is the medical note', () => {
    const notNow = needsOf(PERSONAS.T8).filter((i) => i.priority === 'not_now');
    expect(notNow.every((i) => i.reason === 'medical')).toBe(true);
  });

  it('T6: the anti-age candidate is "not needed now" because of the age', () => {
    const items = needsOf(PERSONAS.T6);
    expect(items.find((i) => i.id === 'need-opt-anti-age')?.reason).toBe('minor');
  });

  it('each item carries the purpose record, the components and the warnings', () => {
    const items = needsOf(PERSONAS.T2);
    const cleanser = items.find((i) => i.id === 'need-cleanser');
    expect(cleanser?.purposeId).toBe('step-base-cleanser');
    expect(cleanser?.componentsToLookFor).toEqual(['group-a']);
    expect(cleanser?.personalWarnings).toContainEqual({ kind: 'reaction', key: 'acids' });
  });

  it('without texts in the content the purpose is null', () => {
    const empty = routineContent([]);
    const { routines, profile, analysis } = routineOf(PERSONAS.T1, [], empty);
    const items = buildShoppingNeeds(routines, [], profile, analysis, empty);
    expect(items.every((item) => item.purposeId === null)).toBe(true);
    expect(items).toHaveLength(3);
  });

  it('ids are unique and stable between calls', () => {
    const first = needsOf(PERSONAS.T1);
    const second = needsOf(PERSONAS.T1);
    expect(first.map((i) => i.id)).toEqual(second.map((i) => i.id));
    expect(new Set(first.map((i) => i.id)).size).toBe(first.length);
    expect(first[0]?.id).toBe('need-cleanser');
  });

  it("the user's own extra step (a mask) goes to the optional group", () => {
    const { routines, profile, analysis, content } = routineOf(PERSONAS.T1);
    const [am, pm] = routines;
    if (!am || !pm) throw new Error('two routines expected');
    const extended = [
      am,
      {
        ...pm,
        steps: [
          ...pm.steps,
          {
            id: 'u1',
            order: 3,
            category: 'mask' as const,
            status: 'to_choose' as const,
            frequency: 'as_needed' as const,
          },
        ],
      },
    ];
    const items = buildShoppingNeeds(extended, [], profile, analysis, content);
    expect(items.find((i) => i.id === 'need-mask')?.priority).toBe('optional');
  });
});
