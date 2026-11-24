import { QUESTION_IDS } from '@/schemas';
import type { SkinProfile, TestAnswers } from '@/types';
import { otherTextKey } from '../test';

/**
 * The reverse of extractProfileFields: the answers that would give this profile.
 * The profile is the source of truth; with these answers the user can change one group
 * of questions ("Change" on the profile screen) and the profile is built again.
 * Empty values are left out, exactly like skipped questions.
 */
export function answersFromProfile(profile: SkinProfile): TestAnswers {
  const answers: TestAnswers = {};
  const set = (key: string, value: string | readonly string[] | null | undefined) => {
    if (value === null || value === undefined) return;
    if (typeof value !== 'string' && value.length === 0) return;
    answers[key] = typeof value === 'string' ? value : [...value];
  };

  set(QUESTION_IDS.baseType, profile.baseType);
  set(QUESTION_IDS.conditions, profile.conditions);
  set(QUESTION_IDS.goals, profile.goals);
  set(otherTextKey(QUESTION_IDS.goals, 'other'), profile.goalOtherText);
  set(QUESTION_IDS.reactions, profile.reactions);
  set(otherTextKey(QUESTION_IDS.reactions, 'other'), profile.reactionOtherText);
  set(QUESTION_IDS.avoid, profile.avoid);
  set(QUESTION_IDS.sex, profile.sex);
  // Phases mean "noticed"; without phases the status itself is the answer.
  if (profile.cycle.phases.length > 0) set(QUESTION_IDS.cycle, profile.cycle.phases);
  else if (profile.cycle.status !== null && profile.cycle.status !== 'noticed') {
    set(QUESTION_IDS.cycle, [profile.cycle.status]); // multi question: always a list
  }
  set(QUESTION_IDS.cycleEffects, profile.cycle.effects);
  set(QUESTION_IDS.productsCount, profile.careHabits.productsCount);
  set(QUESTION_IDS.careTime, profile.careHabits.careTime);
  set(QUESTION_IDS.safetyFlags, profile.safetyFlags);
  set(QUESTION_IDS.ageBand, profile.ageBand);
  return answers;
}
