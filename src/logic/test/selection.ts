import type { Question, TestAnswers } from '@/types';
import { getVisibleQuestions, selectedOptionIds } from './visibility';

type Answer = TestAnswers[string];

/** Key under which the free text of an option with a text field ("Other") is saved. */
export function otherTextKey(questionId: string, optionId: string): string {
  return `${questionId}:${optionId}:text`;
}

/**
 * The new answer after the user taps an option.
 * - single: the tapped option replaces the answer;
 * - multi: the tapped option is toggled; an exclusive option ("No", "Don't know", "Not relevant")
 *   clears everything else, and any other option clears the exclusive ones.
 */
export function applySelection(
  question: Question,
  current: Answer | undefined,
  optionId: string,
): Answer {
  const option = question.options.find((o) => o.id === optionId);
  const chosen = selectedOptionIds(current);
  if (!option) return question.type === 'multi' ? [...chosen] : (chosen[0] ?? '');
  if (question.type !== 'multi') return optionId;

  if (chosen.includes(optionId)) return chosen.filter((id) => id !== optionId);
  if (option.exclusive) return [optionId];
  const exclusiveIds = new Set(question.options.filter((o) => o.exclusive).map((o) => o.id));
  return [...chosen.filter((id) => !exclusiveIds.has(id)), optionId];
}

/**
 * Removes answers that no longer count: answers of questions that are hidden now
 * (for example the cycle effects after "Not relevant"), and free texts of options that are
 * not selected any more. Answers to questions the questionnaire does not know are kept.
 */
export function pruneHiddenAnswers(
  questions: readonly Question[],
  answers: TestAnswers,
): TestAnswers {
  const visibleIds = new Set(getVisibleQuestions(questions, answers).map((q) => q.id));
  const known = new Map(questions.map((q) => [q.id, q]));
  const result: TestAnswers = {};
  const textKeys = new Map<string, string>(); // text key -> option must be selected
  for (const question of questions) {
    for (const option of question.options) {
      if (option.hasText) textKeys.set(otherTextKey(question.id, option.id), question.id);
    }
  }

  for (const [key, value] of Object.entries(answers)) {
    const owner = known.get(key);
    if (owner) {
      if (visibleIds.has(key)) result[key] = value;
      continue;
    }
    const textOwner = textKeys.get(key);
    if (textOwner === undefined) {
      result[key] = value; // unknown key: not ours to delete
      continue;
    }
    const selected = selectedOptionIds(answers[textOwner]);
    const optionId = key.slice(textOwner.length + 1, key.length - ':text'.length);
    if (visibleIds.has(textOwner) && selected.includes(optionId)) result[key] = value;
  }
  return result;
}
