import { QUESTION_IDS } from '@/schemas';
import type { Question, TestAnswers } from '@/types';
import { getVisibleQuestions, isAnswered } from './visibility';

export type InvalidReason =
  'wrong_type' | 'unknown_option' | 'duplicate_option' | 'exclusive_conflict';

export type InvalidAnswer = { questionId: string; reason: InvalidReason };

/** A pair of answers that probably contradict each other. The user is asked, never blocked. */
export type Contradiction = {
  id: 'stable_with_active_condition';
  questionId: string;
  /** The option ids involved, "stable" first. */
  optionIds: string[];
};

export type ValidationResult = {
  /** No missing required answers and no malformed answers. Contradictions do not count. */
  valid: boolean;
  missingRequired: string[];
  invalid: InvalidAnswer[];
  contradictions: Contradiction[];
};

const STABLE = 'stable';
// "Stable" together with any of these asks for a clarification.
const ACTIVE_CONDITIONS = ['sensitive', 'reactive', 'breakouts'] as const;

export function findContradictions(answers: TestAnswers): Contradiction[] {
  const answer = answers[QUESTION_IDS.conditions];
  const chosen = Array.isArray(answer) ? answer : [];
  if (!chosen.includes(STABLE)) return [];
  const active = ACTIVE_CONDITIONS.filter((id) => chosen.includes(id));
  if (active.length === 0) return [];
  return [
    {
      id: 'stable_with_active_condition',
      questionId: QUESTION_IDS.conditions,
      optionIds: [STABLE, ...active],
    },
  ];
}

function checkShape(question: Question, answer: TestAnswers[string]): InvalidReason | null {
  if (question.type === 'text') return typeof answer === 'string' ? null : 'wrong_type';

  const optionIds = new Set(question.options.map((o) => o.id));
  if (question.type === 'single') {
    if (typeof answer !== 'string') return 'wrong_type';
    return optionIds.has(answer) ? null : 'unknown_option';
  }

  if (!Array.isArray(answer)) return 'wrong_type';
  if (answer.some((id) => !optionIds.has(id))) return 'unknown_option';
  if (new Set(answer).size !== answer.length) return 'duplicate_option';
  const exclusive = new Set(question.options.filter((o) => o.exclusive).map((o) => o.id));
  if (answer.length > 1 && answer.some((id) => exclusive.has(id))) return 'exclusive_conflict';
  return null;
}

/** Checks the answers against the questionnaire (only the questions that are visible). */
export function validateAnswers(
  questions: readonly Question[],
  answers: TestAnswers,
): ValidationResult {
  const missingRequired: string[] = [];
  const invalid: InvalidAnswer[] = [];

  for (const question of getVisibleQuestions(questions, answers)) {
    if (!isAnswered(question, answers)) {
      if (question.required) missingRequired.push(question.id);
      continue;
    }
    const answer = answers[question.id];
    const reason = answer === undefined ? null : checkShape(question, answer);
    if (reason) invalid.push({ questionId: question.id, reason });
  }

  return {
    valid: missingRequired.length === 0 && invalid.length === 0,
    missingRequired,
    invalid,
    contradictions: findContradictions(answers),
  };
}
