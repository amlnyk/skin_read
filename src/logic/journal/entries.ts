import type { Feeling, Intensity, JournalCyclePeriod, JournalEntry } from '@/types';
import { SYMPTOM_KEYS, type SymptomKey } from './symptoms';
import type { JournalFieldVisibility } from './visibility';

/** What the form collects. Every field is optional: one filled field is enough. */
export type EntryDraft = {
  date: string;
  feeling?: Feeling;
  symptoms: Partial<Record<SymptomKey, Intensity>>;
  newProductIds: string[];
  shavingIrritation?: Intensity;
  cyclePeriod?: JournalCyclePeriod;
  note: string;
};

/** Is there anything to save? The date alone is not a record. */
export function entryHasContent(draft: EntryDraft): boolean {
  return (
    draft.feeling !== undefined ||
    SYMPTOM_KEYS.some((key) => draft.symptoms[key] !== undefined) ||
    draft.newProductIds.length > 0 ||
    draft.shavingIrritation !== undefined ||
    draft.cyclePeriod !== undefined ||
    draft.note.trim() !== ''
  );
}

/**
 * The entry that is saved. Fields that are not shown for this person are left out, even if the
 * draft has them (a switched-off field never writes into the journal).
 */
export function buildEntry(
  draft: EntryDraft,
  id: string,
  visibility: JournalFieldVisibility,
): JournalEntry {
  const symptoms: JournalEntry['symptoms'] = {};
  for (const key of SYMPTOM_KEYS) {
    const value = draft.symptoms[key];
    if (value !== undefined) symptoms[key] = value;
  }
  const entry: JournalEntry = {
    id,
    date: draft.date,
    symptoms,
    newProductIds: draft.newProductIds,
    note: draft.note.trim(),
  };
  if (draft.feeling !== undefined) entry.feeling = draft.feeling;
  if (visibility.shavingIrritation && draft.shavingIrritation !== undefined) {
    entry.shavingIrritation = draft.shavingIrritation;
  }
  if (visibility.cyclePeriod && draft.cyclePeriod !== undefined)
    entry.cyclePeriod = draft.cyclePeriod;
  return entry;
}

/** Newest day first; entries of the same day: the one added later first. Does not change the input. */
export function sortEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) =>
      a.entry.date === b.entry.date ? b.index - a.index : a.entry.date < b.entry.date ? 1 : -1,
    )
    .map(({ entry }) => entry);
}

/** The same entries without the cycle period (used when the cycle data is deleted). */
export function withoutCyclePeriod(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.map((entry) => {
    if (entry.cyclePeriod === undefined) return entry;
    const copy = { ...entry };
    delete copy.cyclePeriod;
    return copy;
  });
}
