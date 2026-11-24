import { describe, expect, it } from 'vitest';
import { PERSONAS, profileContent } from '@/test/personas';
import type { TestAnswers } from '@/types';
import { answersFromProfile } from './answersFromProfile';
import { buildProfile } from './buildProfile';

const NOW = 1767225600000; // 2026-01-01T00:00:00.000Z
const IDENTITY = { id: 'profile-1', revision: 1, createdAt: '2026-01-01T00:00:00.000Z' };

const build = (answers: TestAnswers, content = profileContent()) =>
  buildProfile(answers, content, NOW, IDENTITY);

describe('buildProfile: the identity and the dates', () => {
  it('takes the id, revision and creation date from the caller and the update time from now', () => {
    const { profile } = build(PERSONAS.T1);
    expect(profile.id).toBe('profile-1');
    expect(profile.revision).toBe(1);
    expect(profile.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(profile.updatedAt).toBe('2026-01-01T00:00:00.000Z');

    const later = buildProfile(PERSONAS.T1, profileContent(), NOW + 86_400_000, {
      ...IDENTITY,
      revision: 2,
    });
    expect(later.profile.revision).toBe(2);
    expect(later.profile.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(later.profile.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});

describe('persona T1: a beginner with oily skin and breakouts', () => {
  const { profile, analysis } = build(PERSONAS.T1);

  it('is a standard profile without restrictions or notes', () => {
    expect(analysis.mode).toBe('standard');
    expect(analysis.restrictions).toEqual({ reactions: [], avoid: [], medicalNotes: [] });
    expect(analysis.notes).toEqual([]);
    expect(analysis.minorMode).toBe(false);
    expect(analysis.contradictions).toEqual([]);
  });

  it('copies the answers into the profile', () => {
    expect(profile.baseType).toBe('oily');
    expect(profile.conditions).toEqual(['breakouts']);
    expect(profile.goals).toEqual(['reduce_breakouts', 'reduce_oiliness']);
    expect(profile.sex).toBe('male');
    expect(profile.ageBand).toBe('18_24');
    expect(profile.cycle).toEqual({ status: 'not_relevant', phases: [], effects: [] });
    expect(profile.careHabits).toEqual({ productsCount: 'none', careTime: 'none' });
    expect(profile.safetyFlags).toEqual([]);
  });

  it('points to the content blocks: the type first, then the conditions', () => {
    expect(analysis.textBlocks).toEqual([
      { kind: 'skin_type', key: 'oily', contentId: 'type-oily' },
      { kind: 'condition', key: 'breakouts', contentId: 'condition-breakouts' },
    ]);
  });
});

describe('persona T2: the example from the spec', () => {
  const { profile, analysis } = build(PERSONAS.T2);

  it('puts the barrier first and keeps the reaction and the wish as restrictions', () => {
    expect(analysis.mode).toBe('barrier_first');
    expect(analysis.restrictions.reactions).toEqual(['acids']);
    expect(analysis.restrictions.avoid).toEqual(['fragrance_essential_oils']);
    expect(analysis.restrictions.medicalNotes).toEqual([]);
  });

  it('suggests a diary for the cycle and nothing else', () => {
    expect(analysis.notes).toEqual(['suggest_cycle_diary']);
    expect(profile.cycle).toEqual({
      status: 'noticed',
      phases: ['pre_menstrual'],
      effects: ['more_breakouts'],
    });
  });

  it('lists the conditions in the order of the dictionary', () => {
    expect(profile.conditions).toEqual(['dehydrated', 'sensitive', 'breakouts']);
    expect(analysis.textBlocks.map((block) => block.key)).toEqual([
      'oily',
      'dehydrated',
      'sensitive',
      'breakouts',
    ]);
  });
});

describe('persona T3: a contradiction', () => {
  it('with both answers kept: the contradiction is recorded and the mode is careful', () => {
    const { profile, analysis } = build(PERSONAS.T3);
    expect(analysis.contradictions).toHaveLength(1);
    expect(analysis.contradictions[0]?.optionIds).toEqual(['stable', 'sensitive']);
    expect(profile.contradictions).toEqual(['stable_with_active_condition']);
    expect(analysis.mode).toBe('barrier_first');
    expect(profile.conditions).toEqual(['sensitive', 'stable']);
  });

  it('with "Stable" removed: no contradiction, the mode stays careful', () => {
    const { profile, analysis } = build({ ...PERSONAS.T3, q2_conditions: ['sensitive'] });
    expect(analysis.contradictions).toEqual([]);
    expect(profile.contradictions).toEqual([]);
    expect(profile.conditions).toEqual(['sensitive']);
    expect(analysis.mode).toBe('barrier_first');
  });

  it('"I do not know" about reactions is not a restriction', () => {
    expect(build(PERSONAS.T3).analysis.restrictions.reactions).toEqual([]);
  });
});

describe('persona T4: the minimum of data', () => {
  const { profile, analysis } = build(PERSONAS.T4);

  it('builds a standard profile without blocking anything', () => {
    expect(analysis.mode).toBe('standard');
    expect(profile.sex).toBeNull();
    expect(profile.ageBand).toBeNull();
    expect(profile.cycle).toEqual({ status: 'declined', phases: [], effects: [] });
    expect(analysis.notes).toEqual([]);
    expect(profile.contradictions).toEqual([]);
  });

  it('works with no answers at all', () => {
    const empty = build({});
    expect(empty.analysis.mode).toBe('standard');
    expect(empty.profile.baseType).toBe('unsure');
    expect(empty.analysis.notes).toEqual(['type_unsure_retest']);
  });
});

describe('persona T5a: alarming signs', () => {
  it('see a doctor, and this wins over everything weaker', () => {
    const { analysis } = build(PERSONAS.T5a);
    expect(analysis.mode).toBe('see_doctor');
    const withSensitive = build({ ...PERSONAS.T5a, q2_conditions: ['sensitive', 'reactive'] });
    expect(withSensitive.analysis.mode).toBe('see_doctor');
  });
});

describe('persona T5b: an emergency', () => {
  it('is the emergency mode', () => {
    expect(build(PERSONAS.T5b).analysis.mode).toBe('emergency');
  });

  it('wins over "see a doctor" too', () => {
    const answers = {
      ...PERSONAS.T5b,
      q9_safety_flags: ['painful_swelling_or_burning', 'breathing_difficulty'],
    };
    expect(build(answers).analysis.mode).toBe('emergency');
  });
});

describe('persona T6: a teenager who is not sure about the type', () => {
  const { profile, analysis } = build(PERSONAS.T6);

  it('is in the careful mode for minors and asks to repeat the test later', () => {
    expect(analysis.minorMode).toBe(true);
    expect(analysis.notes).toEqual(['type_unsure_retest']);
    expect(profile.baseType).toBe('unsure');
  });

  it('keeps the goals the user named, the anti-age one included', () => {
    expect(profile.goals).toEqual(['reduce_breakouts', 'anti_aging']);
  });

  it('has no text block for an unsure type', () => {
    expect(analysis.textBlocks[0]).toEqual({ kind: 'skin_type', key: 'unsure', contentId: null });
  });

  it('an adult is not in the minor mode', () => {
    expect(build({ ...PERSONAS.T6, q10_age_band: '18_24' }).analysis.minorMode).toBe(false);
  });
});

describe('persona T8: a prescription and a pregnancy', () => {
  const { profile, analysis } = build(PERSONAS.T8);

  it('stays in the standard mode but keeps both flags as medical notes', () => {
    expect(analysis.mode).toBe('standard');
    expect(analysis.restrictions.medicalNotes).toEqual([
      'prescribed_derm_treatment',
      'pregnancy_or_planning',
    ]);
    expect(profile.safetyFlags).toEqual(['prescribed_derm_treatment', 'pregnancy_or_planning']);
  });
});

describe('content that is not there yet', () => {
  it('combination skin without its own text: a note and no content id', () => {
    const { analysis } = build({ ...PERSONAS.T1, q2_conditions: ['combination'] });
    expect(analysis.notes).toEqual(['combination_text_pending']);
    expect(analysis.textBlocks).toEqual([
      { kind: 'skin_type', key: 'oily', contentId: 'type-oily' },
      { kind: 'condition', key: 'combination', contentId: null },
    ]);
  });

  it('combination skin with its own text: no note', () => {
    const { analysis } = build(
      { ...PERSONAS.T1, q2_conditions: ['combination'] },
      profileContent({ combinationText: true }),
    );
    expect(analysis.notes).toEqual([]);
    expect(analysis.textBlocks[1]).toEqual({
      kind: 'condition',
      key: 'combination',
      contentId: 'condition-combination',
    });
  });

  it('a record without a description counts as missing: the screen says "being prepared"', () => {
    const { analysis } = build(PERSONAS.T2, profileContent({ texts: false }));
    expect(analysis.textBlocks.every((block) => block.contentId === null)).toBe(true);
  });

  it('empty content (the public policy) gives blocks without ids and still builds', () => {
    const empty = { ...profileContent(), skinTypes: [], conditions: [] };
    const { analysis } = build(PERSONAS.T2, empty);
    expect(analysis.mode).toBe('barrier_first');
    expect(analysis.textBlocks.every((block) => block.contentId === null)).toBe(true);
  });
});

describe('the free texts', () => {
  it('"Other" texts of the goal and the reaction go to the profile', () => {
    const { profile } = build({
      ...PERSONAS.T1,
      q3_goals: ['other'],
      'q3_goals:other:text': 'smoother skin',
      q4_reactions: ['other'],
      'q4_reactions:other:text': 'a cream',
    });
    expect(profile.goalOtherText).toBe('smoother skin');
    expect(profile.reactionOtherText).toBe('a cream');
  });

  it('an empty text is not saved', () => {
    const { profile } = build({ ...PERSONAS.T1, 'q3_goals:other:text': '   ' });
    expect(profile).not.toHaveProperty('goalOtherText');
  });
});

describe('answers of an unexpected shape', () => {
  it('unknown ids are ignored and a lone value is read as a list of one, nothing crashes', () => {
    const { profile } = build({
      q1_base_type: ['oily'],
      q2_conditions: 'sensitive',
      q3_goals: ['nonsense'],
      q6_sex: 'x',
    });
    expect(profile.baseType).toBe('oily');
    expect(profile.conditions).toEqual(['sensitive']);
    expect(profile.goals).toEqual([]);
    expect(profile.sex).toBeNull();
  });
});

describe('answersFromProfile: the way back', () => {
  it.each(['T1', 'T2', 'T3', 'T4', 'T6', 'T8'] as const)(
    'the answers of %s rebuild the same profile',
    (name) => {
      const first = build(PERSONAS[name]);
      const again = build(answersFromProfile(first.profile));
      expect(again.profile).toEqual(first.profile);
      expect(again.analysis).toEqual(first.analysis);
    },
  );

  it('keeps the free texts', () => {
    const first = build({
      ...PERSONAS.T1,
      q3_goals: ['other'],
      'q3_goals:other:text': 'smoother skin',
    });
    expect(answersFromProfile(first.profile)['q3_goals:other:text']).toBe('smoother skin');
  });

  it('skipped answers stay skipped', () => {
    const answers = answersFromProfile(build(PERSONAS.T4).profile);
    expect(answers).not.toHaveProperty('q6_sex');
    expect(answers).not.toHaveProperty('q10_age_band');
    expect(answers.q6_1_cycle).toEqual(['declined']);
  });
});
