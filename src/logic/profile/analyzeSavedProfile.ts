import { QUESTION_IDS, emergencyFlagSchema } from '@/schemas';
import type { ContentBundle, SkinProfile, TestAnswers } from '@/types';
import { answersFromProfile } from './answersFromProfile';
import { buildProfile } from './buildProfile';
import type { ProfileAnalysis } from './types';

/**
 * The analysis of a profile that is already saved (the routine needs the mode and the
 * restrictions). The profile is the source of truth, so the analysis is built from it.
 *
 * The profile cannot keep an emergency sign (it is not a profile field), so an emergency flag
 * of the last test is carried over from the saved answers: the routine screen must not look
 * calmer than the result screen did.
 */
export function analyzeSavedProfile(
  profile: SkinProfile,
  testAnswers: TestAnswers,
  content: ContentBundle,
  now: number,
): ProfileAnalysis {
  const answers = answersFromProfile(profile);

  const saved = testAnswers[QUESTION_IDS.safetyFlags];
  const emergency = Array.isArray(saved)
    ? emergencyFlagSchema.options.filter((flag) => saved.includes(flag))
    : [];
  if (emergency.length > 0) {
    const current = answers[QUESTION_IDS.safetyFlags];
    answers[QUESTION_IDS.safetyFlags] = [...(Array.isArray(current) ? current : []), ...emergency];
  }

  return buildProfile(answers, content, now, {
    id: profile.id,
    revision: profile.revision,
    createdAt: profile.createdAt,
    reactionIngredients: profile.reactionIngredients,
  }).analysis;
}
