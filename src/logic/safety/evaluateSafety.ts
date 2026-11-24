import {
  QUESTION_IDS,
  emergencyFlagSchema,
  safetyFlagSchema,
  type EmergencyFlag,
  type SafetyFlag,
} from '@/schemas';
import type { TestAnswers } from '@/types';

export type SafetyLevel = 'none' | 'see_doctor' | 'emergency';

export type SafetyResult = {
  level: SafetyLevel;
  /** The flags that caused the level (empty for "none"). */
  reasons: (SafetyFlag | EmergencyFlag)[];
  /** Flags that only add a note: they never change the mode. */
  medicalNotes: SafetyFlag[];
};

// Flags that send the user to a doctor.
const SEE_DOCTOR_FLAGS: readonly SafetyFlag[] = [
  'strong_or_prolonged_reaction',
  'painful_swelling_or_burning',
];
// Flags that only produce a note.
const NOTE_FLAGS: readonly SafetyFlag[] = [
  'prescribed_derm_treatment',
  'pregnancy_or_planning',
  'other_limits',
];

function chosenSafetyIds(answers: TestAnswers): string[] {
  const answer = answers[QUESTION_IDS.safetyFlags];
  return Array.isArray(answer) ? answer : [];
}

/**
 * Looks at the safety block of the test.
 * Emergency flags can arrive in the same answer (when the questionnaire gets such options):
 * the function recognises them by id, so no code change is needed then.
 * The order of the results follows the enums, not the order of tapping: same answers, same result.
 */
export function evaluateSafety(answers: TestAnswers): SafetyResult {
  const chosen = new Set(chosenSafetyIds(answers));

  const emergency = emergencyFlagSchema.options.filter((flag) => chosen.has(flag));
  const medicalNotes = safetyFlagSchema.options.filter(
    (flag) => NOTE_FLAGS.includes(flag) && chosen.has(flag),
  );

  if (emergency.length > 0) return { level: 'emergency', reasons: emergency, medicalNotes };

  const seeDoctor = safetyFlagSchema.options.filter(
    (flag) => SEE_DOCTOR_FLAGS.includes(flag) && chosen.has(flag),
  );
  if (seeDoctor.length > 0) return { level: 'see_doctor', reasons: seeDoctor, medicalNotes };

  return { level: 'none', reasons: [], medicalNotes };
}
