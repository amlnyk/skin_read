import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import {
  isSuggestionSnoozed,
  journalFieldVisibility,
  sortEntries,
  suggestProfileUpdate,
  utcDate,
} from '@/logic/journal';
import { useAppStore } from '@/store';

/** Everything the journal screen reads from the store, ready to show. */
export function useJournal() {
  const { clock } = useServices();
  const entries = useAppStore((state) => state.journal);
  const profile = useAppStore((state) => state.profile);
  const settings = useAppStore((state) => state.settings);
  const products = useAppStore((state) => state.products);

  const now = clock.now();
  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const visibility = journalFieldVisibility(profile, settings);

  // "Not now" hides the question for a few days; after that it may come back.
  const snoozed = isSuggestionSnoozed(settings.profileSuggestionSnoozedUntil, utcDate(now));
  const suggestion = snoozed ? null : suggestProfileUpdate(entries, profile, now);

  return { entries: sorted, profile, products, visibility, suggestion, now };
}
