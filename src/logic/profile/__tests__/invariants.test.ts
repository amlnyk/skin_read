import { describe, expect, it } from 'vitest';
import { PERSONAS, profileContent } from '@/test/data/personas';
import type { TestAnswers } from '@/types';
import { analyzeSavedProfile } from '../analyzeSavedProfile';
import { applyRestrictions, type Candidate } from '../applyRestrictions';
import { buildProfile } from '../buildProfile';
import { effectiveGoals } from '../effectiveGoals';
import { RULES } from '../rules';

const NOW = 1767225600000;
const IDENTITY = { id: 'profile-1', revision: 1, createdAt: '2026-01-01T00:00:00.000Z' };
const build = (answers: TestAnswers) => buildProfile(answers, profileContent(), NOW, IDENTITY);

const without = (answers: TestAnswers, ...keys: string[]): TestAnswers =>
  Object.fromEntries(Object.entries(answers).filter(([key]) => !keys.includes(key)));

describe('invariant 1: sex and cycle do not change the type, the mode or the restrictions', () => {
  it('T2 with sex "male", "female", "other" or skipped gives the same analysis', () => {
    const reference = build(PERSONAS.T2).analysis;
    for (const sex of ['male', 'female', 'other_or_undisclosed']) {
      expect(build({ ...PERSONAS.T2, q6_sex: sex }).analysis).toEqual(reference);
    }
    expect(build(without(PERSONAS.T2, 'q6_sex')).analysis).toEqual(reference);
  });

  it('T2 without the cycle answers: the same type, mode, restrictions and blocks', () => {
    const full = build(PERSONAS.T2);
    const cut = build(without(PERSONAS.T2, 'q6_sex', 'q6_1_cycle', 'q6_1_effects'));
    expect(cut.profile.baseType).toBe(full.profile.baseType);
    expect(cut.analysis.mode).toBe(full.analysis.mode);
    expect(cut.analysis.restrictions).toEqual(full.analysis.restrictions);
    expect(cut.analysis.textBlocks).toEqual(full.analysis.textBlocks);
    // the only difference is the suggestion to keep a diary
    expect(full.analysis.notes).toEqual(['suggest_cycle_diary']);
    expect(cut.analysis.notes).toEqual([]);
  });

  it('every cycle answer leaves the mode and the restrictions alone', () => {
    const reference = build(without(PERSONAS.T2, 'q6_1_cycle', 'q6_1_effects')).analysis;
    for (const cycle of [
      ['not_noticed'],
      ['unsure'],
      ['not_relevant'],
      ['declined'],
      ['during_menstrual'],
    ]) {
      const { analysis } = build({ ...PERSONAS.T2, q6_1_cycle: cycle, q6_1_effects: ['oilier'] });
      expect(analysis.mode).toBe(reference.mode);
      expect(analysis.restrictions).toEqual(reference.restrictions);
    }
  });
});

describe('invariant 2: a restriction removes a recommendation of a lower priority', () => {
  const acidStep: Candidate = {
    id: 'acid-exfoliant',
    priority: 6, // it comes from the goal "reduce breakouts"
    reactionGroups: ['acids'],
    avoidTags: [],
  };
  const baseMoisturizer: Candidate = {
    id: 'moisturizer',
    priority: 5,
    reactionGroups: [],
    avoidTags: [],
  };
  const scentedStep: Candidate = {
    id: 'scented-serum',
    priority: 6,
    reactionGroups: [],
    avoidTags: ['fragrance_essential_oils'],
  };

  it('oily skin with breakouts and a reaction to acids gets no acid step', () => {
    const { analysis } = build({
      q1_base_type: 'oily',
      q2_conditions: ['breakouts'],
      q3_goals: ['reduce_breakouts'],
      q4_reactions: ['acids'],
    });
    const kept = applyRestrictions([acidStep, baseMoisturizer], analysis.restrictions);
    expect(kept.map((item) => item.id)).toEqual(['moisturizer']);
  });

  it('without the reaction the acid step stays a candidate', () => {
    const { analysis } = build({ q1_base_type: 'oily', q4_reactions: ['none_noticed'] });
    expect(applyRestrictions([acidStep], analysis.restrictions)).toEqual([acidStep]);
  });

  it('a type-driven step (priority 5) with an acid is removed by the reaction as well', () => {
    const { analysis } = build(PERSONAS.T2);
    const typeDriven: Candidate = { ...acidStep, id: 'type-acid', priority: 5 };
    expect(applyRestrictions([typeDriven], analysis.restrictions)).toEqual([]);
  });

  it('a stronger recommendation (priority 2 or stronger) is not removed by a weaker restriction', () => {
    const { analysis } = build(PERSONAS.T2);
    const prescribed: Candidate = { ...acidStep, id: 'doctor', priority: 2 };
    expect(applyRestrictions([prescribed], analysis.restrictions)).toEqual([prescribed]);
  });

  it('a wish removes goal-driven steps, but not the base care', () => {
    const { analysis } = build(PERSONAS.T2);
    const scentedBase: Candidate = { ...scentedStep, id: 'scented-base', priority: 5 };
    const kept = applyRestrictions([scentedStep, scentedBase], analysis.restrictions);
    expect(kept.map((item) => item.id)).toEqual(['scented-base']);
  });

  it('keeps the order of the candidates', () => {
    const { analysis } = build(PERSONAS.T1);
    const list = [baseMoisturizer, acidStep, scentedStep];
    expect(applyRestrictions(list, analysis.restrictions).map((item) => item.id)).toEqual([
      'moisturizer',
      'acid-exfoliant',
      'scented-serum',
    ]);
  });

  it('a minor does not get the anti-age goal as a driver', () => {
    const { profile, analysis } = build(PERSONAS.T6);
    expect(effectiveGoals(profile.goals, analysis)).toEqual(['reduce_breakouts']);
    const adult = build({ ...PERSONAS.T6, q10_age_band: '25_34' });
    expect(effectiveGoals(adult.profile.goals, adult.analysis)).toEqual([
      'reduce_breakouts',
      'anti_aging',
    ]);
  });
});

describe('invariant 3: the same answers, the same result', () => {
  it.each(Object.entries(PERSONAS))('%s gives an identical result twice', (_name, answers) => {
    expect(build(answers)).toEqual(build(answers));
  });

  it('the order in which options were tapped does not matter', () => {
    const a = build({ ...PERSONAS.T2, q2_conditions: ['breakouts', 'sensitive', 'dehydrated'] });
    const b = build({ ...PERSONAS.T2, q2_conditions: ['dehydrated', 'sensitive', 'breakouts'] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('only the date argument brings time in', () => {
    const early = buildProfile(PERSONAS.T1, profileContent(), NOW, IDENTITY);
    const late = buildProfile(PERSONAS.T1, profileContent(), NOW + 1000, IDENTITY);
    expect(late.analysis).toEqual(early.analysis);
    expect({ ...late.profile, updatedAt: '' }).toEqual({ ...early.profile, updatedAt: '' });
  });
});

describe('invariant 4: no numeric scores', () => {
  const numbers = (value: unknown): number[] => {
    if (typeof value === 'number') return [value];
    if (Array.isArray(value)) return value.flatMap(numbers);
    if (value && typeof value === 'object') return Object.values(value).flatMap(numbers);
    return [];
  };

  it.each(Object.entries(PERSONAS))(
    'the analysis of %s has no numbers at all',
    (_name, answers) => {
      expect(numbers(build(answers).analysis)).toEqual([]);
    },
  );
});

describe('the rules', () => {
  it('run from the strongest priority to the weakest, with unique ids', () => {
    const priorities = RULES.map((rule) => rule.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    expect(new Set(RULES.map((rule) => rule.id)).size).toBe(RULES.length);
    expect(priorities[0]).toBe(1);
    expect(priorities.at(-1)).toBe(7);
  });

  it('a weaker rule cannot override the mode of a stronger one', () => {
    // danger (1) beats the barrier (3)
    expect(build({ ...PERSONAS.T5a, q2_conditions: ['reactive'] }).analysis.mode).toBe(
      'see_doctor',
    );
    // without danger the barrier decides
    expect(
      build({ ...PERSONAS.T5a, q9_safety_flags: [], q2_conditions: ['reactive'] }).analysis.mode,
    ).toBe('barrier_first');
  });

  it('breakouts alone, without sensitivity or reactivity, do not call for the barrier mode', () => {
    expect(build({ q1_base_type: 'oily', q2_conditions: ['breakouts'] }).analysis.mode).toBe(
      'standard',
    );
  });
});

describe('analyzeSavedProfile', () => {
  const NOW = Date.UTC(2026, 0, 1, 12);
  const IDENTITY = { id: 'p', revision: 1, createdAt: '2026-01-01T12:00:00.000Z' };
  const content = profileContent();

  it('gives the same analysis as the one made from the answers, for every persona', () => {
    for (const [name, answers] of Object.entries(PERSONAS)) {
      if (name === 'T5b') continue; // an emergency sign is not part of the profile, see below
      const { profile, analysis } = buildProfile(answers, content, NOW, IDENTITY);
      expect(analyzeSavedProfile(profile, {}, content, NOW), name).toEqual(analysis);
    }
  });

  it('keeps the emergency of the last test: the saved profile alone cannot hold it', () => {
    const { profile, analysis } = buildProfile(PERSONAS.T5b, content, NOW, IDENTITY);
    expect(analysis.mode).toBe('emergency');
    expect(analyzeSavedProfile(profile, {}, content, NOW).mode).not.toBe('emergency');
    expect(analyzeSavedProfile(profile, PERSONAS.T5b, content, NOW).mode).toBe('emergency');
  });

  it('ignores other answers of the saved test', () => {
    const { profile, analysis } = buildProfile(PERSONAS.T1, content, NOW, IDENTITY);
    expect(analyzeSavedProfile(profile, PERSONAS.T2, content, NOW)).toEqual(analysis);
  });
});
