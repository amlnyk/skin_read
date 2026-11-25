import { t } from '@/i18n';
import { groupName, ingredientName } from '@/logic/analyze';
import { QUESTION_IDS, type ContentBundle } from '@/schemas';

// Turns ids from the logic into the texts of the screen. Nothing is invented: when the
// content has no text, the screen says "Інформація готується".

export type LabelContent = Pick<
  ContentBundle,
  'ingredients' | 'ingredientGroups' | 'questionnaire' | 'compatRules'
>;

const filled = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== '';

export function optionLabel(content: LabelContent, questionId: string, optionId: string): string {
  const label = content.questionnaire
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId)?.label;
  return filled(label) ? label : t('scan.pending');
}

export const reactionLabel = (content: LabelContent, id: string) =>
  optionLabel(content, QUESTION_IDS.reactions, id);
export const avoidLabel = (content: LabelContent, id: string) =>
  optionLabel(content, QUESTION_IDS.avoid, id);
export const conditionLabel = (content: LabelContent, id: string) =>
  optionLabel(content, QUESTION_IDS.conditions, id);
export const goalLabel = (content: LabelContent, id: string) =>
  optionLabel(content, QUESTION_IDS.goals, id);
export const safetyLabel = (content: LabelContent, id: string) =>
  optionLabel(content, QUESTION_IDS.safetyFlags, id);

/** The names of ingredients, in the order given. */
export function namesOf(ids: readonly string[], content: LabelContent): string {
  return ids.map((id) => ingredientName(id, content.ingredients)).join(', ');
}

export function groupLabel(id: string, content: LabelContent): string {
  return groupName(id, content.ingredientGroups) ?? t('scan.pending');
}
