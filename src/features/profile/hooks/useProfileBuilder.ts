import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import { buildProfile } from '@/logic/profile';
import { useAppStore, useAppStoreApi } from '@/store';

/**
 * Builds the profile proposal from the finished test. The profile reaches the store only
 * when the user confirms it; until then it is just a calculation from the saved answers.
 * `built` is null while the test is not finished.
 */
export function useProfileBuilder() {
  const { content, clock, ids } = useServices();
  const store = useAppStoreApi();
  const draft = useAppStore((state) => state.testDraft);
  const existing = useAppStore((state) => state.profile);

  const finished = draft.startedAt !== null && draft.currentQuestionId === null;
  const bundle = content.bundle;

  // The revision counts confirmed changes: the proposal is the next one after the saved profile.
  const revision = (existing?.revision ?? 0) + 1;

  const built = useMemo(() => {
    if (!finished) return null;
    const now = clock.now();
    const createdAt = existing?.createdAt ?? new Date(now).toISOString();
    // The real id is made on confirmation, so a repaint does not spend ids.
    return buildProfile(draft.answers, bundle, now, {
      id: existing?.id ?? 'proposal',
      revision,
      createdAt,
    });
  }, [finished, draft.answers, bundle, clock, existing, revision]);

  const confirm = () => {
    if (!built) return;
    const now = clock.now();
    const { profile } = buildProfile(store.getState().testDraft.answers, bundle, now, {
      id: existing?.id ?? ids.next(),
      revision,
      createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    });
    store.getState().actions.profile.set(profile);
  };

  return { built, confirm, hasSavedProfile: existing !== null };
}
