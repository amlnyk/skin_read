import { DEFAULT_JOURNAL_CONFIG, type JournalConfig } from '../config';
import type { Condition, JournalEntry, SkinProfile } from '@/types';
import { daysAgo } from './dates';
import { SYMPTOM_CONDITION, SYMPTOM_KEYS, type SymptomKey } from './symptoms';

export type ProfileUpdateSuggestion = {
  /** The symptoms that were marked often, in the order of SYMPTOM_KEYS. */
  symptoms: SymptomKey[];
  /** The profile states that match them and are not in the profile yet (no repeats). */
  conditions: Condition[];
};

/** Is the entry's day one of the last `windowDays` days (today included)? */
export function isInWindow(date: string, nowMs: number, windowDays: number): boolean {
  const ago = daysAgo(date, nowMs);
  // -1 lets in "today" of a user who is east of UTC; days after that are left out.
  return ago >= -1 && ago < windowDays;
}

/**
 * Does the journal give a reason to ask "do you want to update the profile?".
 *
 * Yes when, among the entries of the last 14 days, the same symptom has intensity 2 or 3 in at
 * least 4 entries and the matching state is not in the profile yet (thresholds: config.ts).
 * It only asks. It says nothing about why, and the profile is never changed here: the user
 * confirms the change on the profile screens.
 */
export function suggestProfileUpdate(
  entries: readonly JournalEntry[],
  profile: SkinProfile | null,
  now: number,
  config: JournalConfig = DEFAULT_JOURNAL_CONFIG,
): ProfileUpdateSuggestion | null {
  if (!profile) return null;
  const recent = entries.filter((entry) => isInWindow(entry.date, now, config.windowDays));

  const symptoms = SYMPTOM_KEYS.filter((key) => {
    const condition = SYMPTOM_CONDITION[key];
    if (condition === null || profile.conditions.includes(condition)) return false;
    const marked = recent.filter((entry) => (entry.symptoms[key] ?? 0) >= config.minIntensity);
    return marked.length >= config.minEntries;
  });
  if (symptoms.length === 0) return null;

  const conditions: Condition[] = [];
  for (const key of symptoms) {
    const condition = SYMPTOM_CONDITION[key];
    if (condition !== null && !conditions.includes(condition)) conditions.push(condition);
  }
  return { symptoms, conditions };
}

/** "Not now" is still in force: the banner is hidden before the saved day. */
export function isSuggestionSnoozed(
  snoozedUntil: string | null | undefined,
  today: string,
): boolean {
  return snoozedUntil !== null && snoozedUntil !== undefined && today < snoozedUntil;
}
