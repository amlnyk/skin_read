import type { ContentBundle, TestAnswers } from '@/types';

// Test personas T1-T8 from the plan (section 5), written as raw answers of the questionnaire.
// The expected results live in the tests; here are only the inputs.

export const PERSONAS: Record<
  'T1' | 'T2' | 'T3' | 'T4' | 'T5a' | 'T5b' | 'T6' | 'T7' | 'T8',
  TestAnswers
> = {
  // Beginner, oily skin with breakouts.
  T1: {
    q1_base_type: 'oily',
    q2_conditions: ['breakouts'],
    q3_goals: ['reduce_breakouts', 'reduce_oiliness'],
    q4_reactions: ['none_noticed'],
    q5_avoid: ['none'],
    q6_sex: 'male',
    q6_1_cycle: ['not_relevant'],
    q7_products_count: 'none',
    q8_care_time: 'none',
    q10_age_band: '18_24',
  },
  // The example from the spec: reactive, oily, a reaction to acids, notices a cycle effect.
  T2: {
    q1_base_type: 'oily',
    q2_conditions: ['dehydrated', 'sensitive', 'breakouts'],
    q3_goals: ['reduce_breakouts', 'hydrate'],
    q4_reactions: ['acids'],
    q5_avoid: ['fragrance_essential_oils'],
    q6_sex: 'female',
    q6_1_cycle: ['pre_menstrual'],
    q6_1_effects: ['more_breakouts'],
    q7_products_count: '3_4',
    q8_care_time: 'morning_evening',
    q10_age_band: '18_24',
  },
  // A contradiction: "stable" together with "sensitive".
  T3: {
    q1_base_type: 'dry',
    q2_conditions: ['stable', 'sensitive'],
    q3_goals: ['maintain_healthy'],
    q4_reactions: ['unknown'],
    q5_avoid: ['none'],
    q6_sex: 'other_or_undisclosed',
  },
  // The minimum of data: sex, safety block and age are skipped.
  T4: {
    q1_base_type: 'normal',
    q2_conditions: ['stable'],
    q3_goals: ['maintain_healthy'],
    q4_reactions: ['none_noticed'],
    q5_avoid: ['none'],
    q6_1_cycle: ['declined'],
    q7_products_count: '1_2',
    q8_care_time: 'morning_evening',
  },
  // Alarming signs: see a doctor.
  T5a: {
    q1_base_type: 'oily',
    q2_conditions: ['breakouts'],
    q9_safety_flags: ['painful_swelling_or_burning'],
  },
  // An emergency.
  T5b: {
    q1_base_type: 'oily',
    q9_safety_flags: ['lip_or_tongue_swelling'],
  },
  // A teenager who is not sure about the type, with an anti-age goal.
  T6: {
    q1_base_type: 'unsure',
    q2_conditions: ['breakouts'],
    q3_goals: ['anti_aging', 'reduce_breakouts'],
    q10_age_band: 'under_18',
  },
  // A routine with conflicts (stages 8 and 9): sensitive oily skin that avoids fragrance. The products of
  // the persona are built in the tests of the stages.
  T7: {
    q1_base_type: 'oily',
    q2_conditions: ['sensitive'],
    q3_goals: ['reduce_breakouts'],
    q4_reactions: ['none_noticed'],
    q5_avoid: ['fragrance_essential_oils'],
    q10_age_band: '25_34',
  },
  // A prescription and a pregnancy: notes only, the mode stays "standard".
  T8: {
    q1_base_type: 'normal',
    q2_conditions: ['stable'],
    q9_safety_flags: ['prescribed_derm_treatment', 'pregnancy_or_planning'],
  },
};

const META = { source: 'test fixture', reviewStatus: 'draft' as const };

/**
 * A small content bundle for the profile tests: texts for the three base types and for every
 * condition except combination (like the real material). With `combinationText` the
 * combination record has a text too; with `texts: false` all descriptions are null.
 */
export function profileContent({
  combinationText = false,
  texts = true,
}: { combinationText?: boolean; texts?: boolean } = {}): ContentBundle {
  const description = (value: string) => (texts ? value : null);
  const conditions = [
    'dehydrated',
    'sensitive',
    'reactive',
    'breakouts',
    'pigmentation',
    'aging_signs',
    'stable',
  ] as const;
  return {
    questionnaire: [],
    skinTypes: (['oily', 'dry', 'normal'] as const).map((baseType) => ({
      ...META,
      id: `type-${baseType}`,
      baseType,
      nameUk: `name ${baseType}`,
      description: description(`text ${baseType}`),
    })),
    conditions: [
      ...conditions.map((condition) => ({
        ...META,
        id: `condition-${condition}`,
        condition,
        nameUk: `name ${condition}`,
        description: description(`text ${condition}`),
      })),
      ...(combinationText
        ? [
            {
              ...META,
              id: 'condition-combination',
              condition: 'combination' as const,
              nameUk: 'name combination',
              description: 'text combination',
            },
          ]
        : []),
    ],
    recommendations: [],
    ingredientGroups: [],
    ingredients: [],
    compatRules: [],
    safetyMessages: [],
    productCategories: [],
    routineSteps: [],
    observationTemplates: [],
  };
}
