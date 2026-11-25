import { t } from '@/i18n';
import type { CompatSubject, ConditionNote } from '@/logic/compat';
import { QUESTION_IDS, type ContentBundle } from '@/schemas';

// Turns ids from the logic into the texts of the screen. Nothing is invented here:
// when the content has no text, the screen says "Інформація готується".

export type CompatLabelContent = Pick<
  ContentBundle,
  'ingredients' | 'ingredientGroups' | 'questionnaire'
>;

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== '';

export function subjectName(
  subject: Pick<CompatSubject, 'kind' | 'id'>,
  content: CompatLabelContent,
): string {
  if (subject.kind === 'group') {
    const group = content.ingredientGroups.find((entry) => entry.id === subject.id);
    return hasText(group?.nameUk) ? group.nameUk : t('common.contentPending');
  }
  const ingredient = content.ingredients.find((entry) => entry.id === subject.id);
  if (!ingredient) return subject.id;
  return hasText(ingredient.nameUk) ? ingredient.nameUk : ingredient.inci;
}

/** The name of an ingredient or group that is not in the content: the id is all we have. */
export function unknownNames(
  subjects: readonly CompatSubject[],
  content: CompatLabelContent,
): string {
  return subjects.map((subject) => subjectName(subject, content)).join(', ');
}

function optionLabel(content: CompatLabelContent, questionId: string, optionId: string): string {
  const label = content.questionnaire
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId)?.label;
  return label ?? t('common.contentPending');
}

/** A profile value is worded with the same text the questionnaire showed for that answer. */
export function noteLabel(note: ConditionNote, content: CompatLabelContent): string {
  const questionId = note.kind === 'condition' ? QUESTION_IDS.conditions : QUESTION_IDS.reactions;
  return optionLabel(content, questionId, note.value);
}
