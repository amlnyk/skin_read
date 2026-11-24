import { t } from '@/i18n';
import type { Question } from '@/types';

/**
 * The text of an answer option as the questionnaire shows it. The wording belongs to the
 * content (questionnaire.json), so the profile screens reuse it instead of writing their own.
 */
export function optionLabel(
  questions: readonly Question[],
  questionId: string,
  optionId: string,
): string {
  const label = questions
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId)?.label;
  return label ?? t('common.contentPending');
}

export function optionLabels(
  questions: readonly Question[],
  questionId: string,
  optionIds: readonly string[],
): string[] {
  return optionIds.map((id) => optionLabel(questions, questionId, id));
}
