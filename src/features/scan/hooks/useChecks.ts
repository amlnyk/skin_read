import { useCallback, useMemo } from 'react';
import { useServices } from '@/lib/services';
import { analyzeProduct, needsComposition } from '@/logic/analyze';
import { analyzeSavedProfile } from '@/logic/profile';
import { useAppStore, useAppStoreApi } from '@/store';
import type { Product, ScanResult } from '@/types';

/**
 * Runs the analysis of a product for the saved profile and keeps the result in the history.
 * Returns null when there is nothing to check: no saved profile, or a product with no
 * composition (it is never analysed, and nothing is invented).
 */
export function useChecks() {
  const { content, clock, ids } = useServices();
  const store = useAppStoreApi();
  const profile = useAppStore((state) => state.profile);
  const testAnswers = useAppStore((state) => state.testDraft.answers);

  const analysis = useMemo(
    () => (profile ? analyzeSavedProfile(profile, testAnswers, content.bundle, clock.now()) : null),
    [profile, testAnswers, content, clock],
  );

  const check = useCallback(
    (product: Product): ScanResult | null => {
      if (!profile || !analysis || needsComposition(product)) return null;
      const state = store.getState();
      const result = analyzeProduct({
        id: `scan-${ids.next()}`,
        product,
        profile,
        analysis,
        routines: state.routine,
        products: state.products,
        content: content.bundle,
        now: clock.now(),
      });
      state.actions.scans.add(result);
      return result;
    },
    [profile, analysis, store, ids, content, clock],
  );

  return { profile, analysis, check };
}
