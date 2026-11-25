import type { Condition, Symptoms } from '@/types';

// The seven symptoms of a journal entry, in the order they are shown.
export const SYMPTOM_KEYS = [
  'dryness',
  'oiliness',
  'redness',
  'sensitivity',
  'burning',
  'breakouts',
  'flaking',
] as const satisfies readonly (keyof Symptoms)[];
export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

/**
 * The profile state that matches a symptom ("what would the profile say about it").
 * It only decides which answer is already ticked when the user is asked to update the profile:
 * the user can change it, and nothing is saved until they confirm. `null` means the profile has
 * no such state (oiliness is the base type, not a state), so the symptom never starts a question.
 *
 * PROPOSED, not from the spec: the pairs are waiting for the cosmetologist (docs/architecture/decisions.md).
 */
export const SYMPTOM_CONDITION: Readonly<Record<SymptomKey, Condition | null>> = {
  dryness: 'dehydrated',
  oiliness: null,
  redness: 'sensitive',
  sensitivity: 'sensitive',
  burning: 'reactive',
  breakouts: 'breakouts',
  flaking: 'dehydrated',
};
