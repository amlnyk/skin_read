// Stable ids of the questionnaire questions (src/content/questionnaire.json).
// Logic (contradictions, profile scoring at stage 4) refers to questions by these ids.
export const QUESTION_IDS = {
  baseType: 'q1_base_type',
  conditions: 'q2_conditions',
  goals: 'q3_goals',
  reactions: 'q4_reactions',
  avoid: 'q5_avoid',
  sex: 'q6_sex',
  cycle: 'q6_1_cycle',
  cycleEffects: 'q6_1_effects',
  productsCount: 'q7_products_count',
  careTime: 'q8_care_time',
  safetyFlags: 'q9_safety_flags',
  ageBand: 'q10_age_band',
} as const;
