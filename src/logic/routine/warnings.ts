import type { ProfileAnalysis } from '../profile';
import type { PersonalWarning } from './types';

/**
 * What the profile asks to keep in mind: known reactions, wishes to avoid and medical notes.
 * The same list stands at every step: the content does not say yet which ingredient groups
 * belong to which category, so nothing is narrowed down by guesswork.
 */
export function personalWarnings(
  analysis: Pick<ProfileAnalysis, 'restrictions'>,
): PersonalWarning[] {
  const { reactions, avoid, medicalNotes } = analysis.restrictions;
  return [
    ...reactions.map((key): PersonalWarning => ({ kind: 'reaction', key })),
    ...avoid
      .filter((key) => key !== 'none')
      .map((key): PersonalWarning => ({ kind: 'avoid', key })),
    ...medicalNotes.map((key): PersonalWarning => ({ kind: 'medical', key })),
  ];
}
