import { describe, expect, it } from 'vitest';
import {
  applySelection,
  getVisibleQuestions,
  pruneHiddenAnswers,
  validateAnswers,
} from '@/logic/test';
import { createRealContent } from '@/test/helpers/fakes';

// The expectations of the stage 3 task, checked on the real questionnaire.json
// (not on a copy), so a change in the JSON that breaks the rules is caught.
const questions = createRealContent('demo').bundle.questionnaire;
const question = (id: string) => {
  const found = questions.find((q) => q.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const ids = (answers: Parameters<typeof getVisibleQuestions>[1]) =>
  getVisibleQuestions(questions, answers).map((q) => q.id);

describe('visibility rules of the real questionnaire', () => {
  it('6.1 "Not relevant": no effects. "Yes, before menstruation": effects follow 6.1', () => {
    expect(ids({ q6_1_cycle: ['not_relevant'] })).not.toContain('q6_1_effects');
    const withEffects = ids({ q6_1_cycle: ['pre_menstrual'] });
    expect(withEffects).toContain('q6_1_effects');
    expect(withEffects.indexOf('q6_1_effects')).toBe(withEffects.indexOf('q6_1_cycle') + 1);
  });

  it('6.1 is hidden for "male" and shown for the other answers and a skipped sex', () => {
    for (const sex of ['female', 'other_or_undisclosed']) {
      expect(ids({ q6_sex: sex })).toContain('q6_1_cycle');
    }
    expect(ids({})).toContain('q6_1_cycle');
    expect(ids({ q6_sex: 'male' })).not.toContain('q6_1_cycle');
    expect(ids({ q6_sex: 'male', q6_1_cycle: ['pre_menstrual'] })).not.toContain('q6_1_effects');
  });

  it('pregnancy stays in the safety question for everyone', () => {
    const safety = question('q9_safety_flags');
    expect(safety.options.map((o) => o.id)).toContain('pregnancy_or_planning');
    expect(ids({ q6_sex: 'male' })).toContain('q9_safety_flags');
  });

  it('only the cycle questions depend on another question', () => {
    expect(questions.filter((q) => q.showIf).map((q) => q.id)).toEqual([
      'q6_1_cycle',
      'q6_1_effects',
    ]);
  });
});

describe('selection rules of the real questionnaire', () => {
  it('question 4: Retinoids, then "No" leaves only "No"; then Acids removes "No"', () => {
    const q4 = question('q4_reactions');
    const afterRetinoids = applySelection(q4, undefined, 'retinoids');
    const afterNo = applySelection(q4, afterRetinoids, 'none_noticed');
    expect(afterNo).toEqual(['none_noticed']);
    expect(applySelection(q4, afterNo, 'acids')).toEqual(['acids']);
  });

  it('question 5: "Don\'t avoid anything" is exclusive too', () => {
    const q5 = question('q5_avoid');
    expect(applySelection(q5, ['silicones', 'parabens'], 'none')).toEqual(['none']);
    expect(applySelection(q5, ['none'], 'alcohol')).toEqual(['alcohol']);
  });

  it('question 6.1: the four "no" answers are exclusive, the three "yes" answers combine', () => {
    const q = question('q6_1_cycle');
    expect(applySelection(q, ['pre_menstrual'], 'during_menstrual')).toEqual([
      'pre_menstrual',
      'during_menstrual',
    ]);
    expect(applySelection(q, ['pre_menstrual'], 'declined')).toEqual(['declined']);
  });

  it('dropping 6.1 to "Not relevant" removes the effects answers', () => {
    const answers = { q6_1_cycle: ['not_relevant'], q6_1_effects: ['oilier'] };
    expect(pruneHiddenAnswers(questions, answers)).toEqual({ q6_1_cycle: ['not_relevant'] });
  });
});

describe('validation of the real questionnaire', () => {
  const required = {
    q1_base_type: 'oily',
    q2_conditions: ['stable'],
    q3_goals: ['maintain_healthy'],
    q4_reactions: ['none_noticed'],
    q5_avoid: ['none'],
    q7_products_count: '1_2',
    q8_care_time: 'morning_evening',
  };

  it('Q2 [stable, sensitive] is a contradiction; [stable] and [stable, dehydrated] are not', () => {
    const check = (q2: string[]) =>
      validateAnswers(questions, { ...required, q2_conditions: q2 }).contradictions.length;
    expect(check(['stable', 'sensitive'])).toBe(1);
    expect(check(['stable'])).toBe(0);
    expect(check(['stable', 'dehydrated'])).toBe(0);
  });

  it('skipping question 6, 6.1 and the whole safety block gives no errors', () => {
    const result = validateAnswers(questions, required);
    expect(result.valid).toBe(true);
    expect(result.missingRequired).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it('every required question is reported when nothing is answered', () => {
    expect(validateAnswers(questions, {}).missingRequired).toEqual([
      'q1_base_type',
      'q2_conditions',
      'q3_goals',
      'q4_reactions',
      'q5_avoid',
      'q7_products_count',
      'q8_care_time',
    ]);
  });
});
