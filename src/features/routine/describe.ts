import { t } from '@/i18n';
import type { PersonalWarning } from '@/logic/routine';
import { QUESTION_IDS } from '@/schemas';
import type { ContentBundle, ProductCategory, RoutineStep } from '@/types';

// Turns ids from the logic into the texts of the screen. Nothing is invented here:
// when the content has no text, the screen says "Інформація готується".

export const categoryName = (category: ProductCategory) => t(`category.${category}`);

export function stepName(
  step: Pick<RoutineStep, 'category' | 'contentId'>,
  content: Pick<ContentBundle, 'routineSteps'>,
): string {
  const info = step.contentId
    ? content.routineSteps.find((item) => item.id === step.contentId)
    : undefined;
  return info?.title ?? categoryName(step.category);
}

export function purposeText(
  purposeId: string | null,
  content: Pick<ContentBundle, 'routineSteps'>,
): string {
  const info = purposeId ? content.routineSteps.find((item) => item.id === purposeId) : undefined;
  return info?.purpose ?? t('common.contentPending');
}

export function componentNames(
  ids: readonly string[],
  content: Pick<ContentBundle, 'ingredientGroups'>,
): string[] {
  return ids.map(
    (id) =>
      content.ingredientGroups.find((group) => group.id === id)?.nameUk ??
      t('common.contentPending'),
  );
}

function optionLabel(
  content: Pick<ContentBundle, 'questionnaire'>,
  questionId: string,
  optionId: string,
) {
  const label = content.questionnaire
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId)?.label;
  return label ?? t('common.contentPending');
}

/** A warning is worded with the same text the questionnaire showed for that answer. */
export function warningText(
  warning: PersonalWarning,
  content: Pick<ContentBundle, 'questionnaire'>,
): string {
  switch (warning.kind) {
    case 'reaction':
      return t('care.warningReaction', {
        name: optionLabel(content, QUESTION_IDS.reactions, warning.key),
      });
    case 'avoid':
      return t('care.warningAvoid', {
        name: optionLabel(content, QUESTION_IDS.avoid, warning.key),
      });
    case 'medical':
      return t('care.warningMedical', {
        name: optionLabel(content, QUESTION_IDS.safetyFlags, warning.key),
      });
  }
}
