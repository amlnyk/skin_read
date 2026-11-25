import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import { analyzeSavedProfile } from '@/logic/profile';
import { analyzeRoutine, routineProducts } from '@/logic/routine';
import { useAppStore } from '@/store';

/**
 * The analysis of the whole routine for the saved profile. It is calculated again from the
 * routine, the products and the content every time, never saved: removing a product from the
 * routine removes its observations at once.
 */
export function useRoutineAnalysis() {
  const { content, clock } = useServices();
  const profile = useAppStore((state) => state.profile);
  const routines = useAppStore((state) => state.routine);
  const products = useAppStore((state) => state.products);
  const testAnswers = useAppStore((state) => state.testDraft.answers);
  const bundle = content.bundle;

  const analysis = useMemo(
    () => (profile ? analyzeSavedProfile(profile, testAnswers, bundle, clock.now()) : null),
    [profile, testAnswers, bundle, clock],
  );

  const productCount = useMemo(
    () => routineProducts(routines, products).length,
    [routines, products],
  );

  const observations = useMemo(
    () =>
      profile && analysis ? analyzeRoutine(routines, products, profile, analysis, bundle) : [],
    [profile, analysis, routines, products, bundle],
  );

  return { profile, products, observations, productCount, bundle };
}
