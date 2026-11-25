import type { SafetyFlag } from './enums';

// Stable ids of the records in src/content/data/safety-messages.json.
// Logic and screens find a message by these ids; the content test checks that they exist.
export const SAFETY_MESSAGE_IDS = {
  emergency: 'safety-emergency',
  seeDoctor: 'safety-see_doctor',
} as const;

/** Id of the note that belongs to a medical flag (prescribed treatment, pregnancy, other). */
export function safetyNoteId(flag: SafetyFlag): string {
  return `safety-note-${flag}`;
}
