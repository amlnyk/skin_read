import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import { needsComposition } from '@/logic/analyze';
import { analyzeSavedProfile } from '@/logic/profile';
import { useAppStore } from '@/store';
import type { Product } from '@/types';

export type CompareSource = {
  /** `p:<productId>` for the collection, `s:<scanId>` for a snapshot from the history. */
  key: string;
  product: Product;
  fromHistory: boolean;
};

/**
 * The products that can be compared: the collection first, then the snapshots of the history
 * (the newest per product, and only those not in the collection). A product without a
 * composition is left out: there is nothing to compare.
 */
export function useCompareSources(): CompareSource[] {
  const products = useAppStore((state) => state.products);
  const scans = useAppStore((state) => state.scans);

  return useMemo(() => {
    const own: CompareSource[] = products
      .filter((product) => !needsComposition(product))
      .map((product) => ({ key: `p:${product.id}`, product, fromHistory: false }));
    const known = new Set(products.map((product) => product.id));
    const fromHistory: CompareSource[] = [];
    const newestFirst = [...scans].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
    for (const scan of newestFirst) {
      const snapshot = scan.productSnapshot;
      if (known.has(snapshot.id) || needsComposition(snapshot)) continue;
      known.add(snapshot.id);
      fromHistory.push({ key: `s:${scan.id}`, product: snapshot, fromHistory: true });
    }
    return [...own, ...fromHistory];
  }, [products, scans]);
}

/** The analysis of the saved profile; null while there is no profile. */
export function useProfileAnalysis() {
  const { content, clock } = useServices();
  const profile = useAppStore((state) => state.profile);
  const testAnswers = useAppStore((state) => state.testDraft.answers);
  const analysis = useMemo(
    () => (profile ? analyzeSavedProfile(profile, testAnswers, content.bundle, clock.now()) : null),
    [profile, testAnswers, content, clock],
  );
  return { profile, analysis };
}
