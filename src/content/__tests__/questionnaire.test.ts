import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import {
  ageBandSchema,
  avoidPrefSchema,
  baseTypeSchema,
  careTimeSchema,
  conditionSchema,
  cycleEffectSchema,
  cyclePhaseSchema,
  cycleStatusSchema,
  goalSchema,
  productsCountSchema,
  QUESTION_IDS,
  reactionGroupSchema,
  safetyFlagSchema,
  sexSchema,
} from '@/schemas';
import { loadBundledContent } from '../bundled';

const result = loadBundledContent('demo');
if (!result.ok) throw new Error('content must load');
const questions = result.value.bundle.questionnaire;
const byId = (id: string) => {
  const found = questions.find((q) => q.id === id);
  if (!found) throw new Error(`question ${id} is missing`);
  return found;
};

// Every option id must be a value of the vocabulary enum the profile stores (stage 4).
const vocabulary: Record<string, ZodType[]> = {
  [QUESTION_IDS.baseType]: [baseTypeSchema],
  [QUESTION_IDS.conditions]: [conditionSchema],
  [QUESTION_IDS.goals]: [goalSchema],
  [QUESTION_IDS.reactions]: [reactionGroupSchema],
  [QUESTION_IDS.avoid]: [avoidPrefSchema],
  [QUESTION_IDS.sex]: [sexSchema],
  [QUESTION_IDS.cycle]: [cyclePhaseSchema, cycleStatusSchema],
  [QUESTION_IDS.cycleEffects]: [cycleEffectSchema],
  [QUESTION_IDS.productsCount]: [productsCountSchema],
  [QUESTION_IDS.careTime]: [careTimeSchema],
  [QUESTION_IDS.safetyFlags]: [safetyFlagSchema],
  [QUESTION_IDS.ageBand]: [ageBandSchema],
};

describe('questionnaire.json', () => {
  it.each(Object.entries(vocabulary))('options of %s use the vocabulary values', (id, schemas) => {
    for (const option of byId(id).options) {
      expect(
        schemas.some((schema) => schema.safeParse(option.id).success),
        `${id}: ${option.id}`,
      ).toBe(true);
    }
  });

  it('required questions are 1, 2, 3, 4, 5, 7, 8; the rest can be skipped', () => {
    const required = questions.filter((q) => q.required).map((q) => q.id);
    expect(required).toEqual([
      QUESTION_IDS.baseType,
      QUESTION_IDS.conditions,
      QUESTION_IDS.goals,
      QUESTION_IDS.reactions,
      QUESTION_IDS.avoid,
      QUESTION_IDS.productsCount,
      QUESTION_IDS.careTime,
    ]);
  });

  it('exclusive options are the "no / don\'t know / not relevant" answers', () => {
    const exclusive = (id: string) =>
      byId(id)
        .options.filter((o) => o.exclusive)
        .map((o) => o.id);
    expect(exclusive(QUESTION_IDS.reactions)).toEqual(['none_noticed', 'unknown']);
    expect(exclusive(QUESTION_IDS.avoid)).toEqual(['none']);
    expect(exclusive(QUESTION_IDS.cycle)).toEqual([
      'not_noticed',
      'unsure',
      'not_relevant',
      'declined',
    ]);
  });

  it('the conditions of showing live in the JSON, not in the screen code', () => {
    expect(byId(QUESTION_IDS.cycleEffects).showIf).toEqual({
      questionId: QUESTION_IDS.cycle,
      anyOf: ['pre_menstrual', 'during_menstrual', 'other_phase'],
    });
    expect(questions.filter((q) => q.showIf).map((q) => q.id)).toEqual([QUESTION_IDS.cycleEffects]);
  });

  it('options added as recommendations are flagged "proposed"', () => {
    const proposed = questions.flatMap((q) =>
      q.options.filter((o) => o.proposed).map((o) => `${q.id}:${o.id}`),
    );
    expect(proposed).toEqual(
      expect.arrayContaining([
        'q1_base_type:unsure',
        'q7_products_count:none',
        'q8_care_time:morning_only',
        'q8_care_time:none',
      ]),
    );
    // the options that are in the cosmetologist's questionnaire are not flagged
    expect(byId(QUESTION_IDS.conditions).options.some((o) => o.proposed)).toBe(false);
  });

  it('texts that are not in the supplied materials are null, never invented', () => {
    // descriptions of the question 1 options are still to come from the cosmetologist
    expect(byId(QUESTION_IDS.baseType).options.every((o) => o.description === null)).toBe(true);
    expect(byId(QUESTION_IDS.cycleEffects).text).toBeNull();
    expect(byId(QUESTION_IDS.safetyFlags).text).toBeNull();
    expect(byId(QUESTION_IDS.ageBand).text).toBeNull();
  });

  it('only options that have a text field are flagged hasText ("Other")', () => {
    const withText = questions.flatMap((q) =>
      q.options.filter((o) => o.hasText).map((o) => `${q.id}:${o.id}`),
    );
    expect(withText).toEqual(['q3_goals:other', 'q4_reactions:other', 'q6_1_effects:other']);
  });
});
