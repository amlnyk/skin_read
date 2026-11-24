import type { Question, TestAnswers } from '@/types';

/** The option ids chosen for a question, whatever the answer type. */
export function selectedOptionIds(answer: TestAnswers[string] | undefined): readonly string[] {
  if (answer === undefined) return [];
  return Array.isArray(answer) ? answer : [answer];
}

/**
 * The questions to show for the given answers, in questionnaire order.
 * A question with `showIf` is shown only when the question it depends on is shown itself
 * and its answer contains one of `anyOf`. The rules live in questionnaire.json, not in code.
 */
export function getVisibleQuestions(
  questions: readonly Question[],
  answers: TestAnswers,
): Question[] {
  const visibleIds = new Set<string>();
  const visible: Question[] = [];
  for (const question of questions) {
    const rule = question.showIf;
    if (rule) {
      const parentShown = visibleIds.has(rule.questionId);
      const chosen = selectedOptionIds(answers[rule.questionId]);
      if (!parentShown || !rule.anyOf.some((id) => chosen.includes(id))) continue;
    }
    visibleIds.add(question.id);
    visible.push(question);
  }
  return visible;
}

/** True when the question has a non-empty answer. */
export function isAnswered(question: Question, answers: TestAnswers): boolean {
  const answer = answers[question.id];
  if (answer === undefined) return false;
  return Array.isArray(answer) ? answer.length > 0 : answer.trim().length > 0;
}
