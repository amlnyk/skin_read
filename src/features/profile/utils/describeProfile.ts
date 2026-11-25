import type { MessageKey } from '@/i18n';
import { QUESTION_IDS } from '@/schemas';
import type { Question, SkinProfile } from '@/types';
import { optionLabel, optionLabels } from './labels';

export type ProfileGroupId =
  'type' | 'conditions' | 'goals' | 'restrictions' | 'sensitive' | 'habits' | 'safety';

export type ProfileGroup = {
  id: ProfileGroupId;
  titleKey: MessageKey;
  /** The questions asked again when the user presses "Change". */
  questionIds: string[];
};

export const PROFILE_GROUPS: readonly ProfileGroup[] = [
  { id: 'type', titleKey: 'profile.typeTitle', questionIds: [QUESTION_IDS.baseType] },
  { id: 'conditions', titleKey: 'profile.conditionsTitle', questionIds: [QUESTION_IDS.conditions] },
  { id: 'goals', titleKey: 'profile.goalsTitle', questionIds: [QUESTION_IDS.goals] },
  {
    id: 'restrictions',
    titleKey: 'profile.restrictionsTitle',
    questionIds: [QUESTION_IDS.reactions, QUESTION_IDS.avoid],
  },
  {
    id: 'sensitive',
    titleKey: 'profile.sensitiveTitle',
    questionIds: [QUESTION_IDS.sex, QUESTION_IDS.cycle, QUESTION_IDS.cycleEffects],
  },
  {
    id: 'habits',
    titleKey: 'profile.habitsTitle',
    questionIds: [QUESTION_IDS.productsCount, QUESTION_IDS.careTime],
  },
  {
    id: 'safety',
    titleKey: 'profile.safetyTitle',
    questionIds: [QUESTION_IDS.safetyFlags, QUESTION_IDS.ageBand],
  },
];

// "Other" options show what the user wrote instead of the bare word.
function withOtherText(label: string, id: string, text: string | undefined): string {
  return id === 'other' && text ? `${label}: ${text}` : label;
}

/** The values of one group of the profile as readable lines (texts come from the questionnaire). */
export function groupValues(
  group: ProfileGroupId,
  profile: SkinProfile,
  questions: readonly Question[],
): string[] {
  const labels = (questionId: string, ids: readonly string[]) =>
    optionLabels(questions, questionId, ids);

  switch (group) {
    case 'type':
      return labels(QUESTION_IDS.baseType, [profile.baseType]);
    case 'conditions':
      return labels(QUESTION_IDS.conditions, profile.conditions);
    case 'goals':
      return profile.goals.map((id) =>
        withOtherText(optionLabel(questions, QUESTION_IDS.goals, id), id, profile.goalOtherText),
      );
    case 'restrictions':
      return [
        ...profile.reactions.map((id) =>
          withOtherText(
            optionLabel(questions, QUESTION_IDS.reactions, id),
            id,
            profile.reactionOtherText,
          ),
        ),
        ...labels(QUESTION_IDS.avoid, profile.avoid),
      ];
    case 'sensitive': {
      const { status, phases, effects } = profile.cycle;
      return [
        ...(profile.sex ? labels(QUESTION_IDS.sex, [profile.sex]) : []),
        ...(phases.length > 0
          ? labels(QUESTION_IDS.cycle, phases)
          : status
            ? labels(QUESTION_IDS.cycle, [status])
            : []),
        ...labels(QUESTION_IDS.cycleEffects, effects),
      ];
    }
    case 'habits': {
      const { productsCount, careTime } = profile.careHabits;
      return [
        ...(productsCount ? labels(QUESTION_IDS.productsCount, [productsCount]) : []),
        ...(careTime ? labels(QUESTION_IDS.careTime, [careTime]) : []),
      ];
    }
    case 'safety':
      return [
        ...labels(QUESTION_IDS.safetyFlags, profile.safetyFlags),
        ...(profile.ageBand ? labels(QUESTION_IDS.ageBand, [profile.ageBand]) : []),
      ];
  }
}

/** The restrictions the algorithm found, as lines for the result screen. */
export function restrictionValues(
  profile: SkinProfile,
  restrictions: { reactions: readonly string[]; avoid: readonly string[] },
  questions: readonly Question[],
): string[] {
  return [
    ...restrictions.reactions.map((id) =>
      withOtherText(
        optionLabel(questions, QUESTION_IDS.reactions, id),
        id,
        profile.reactionOtherText,
      ),
    ),
    ...optionLabels(questions, QUESTION_IDS.avoid, restrictions.avoid),
  ];
}
