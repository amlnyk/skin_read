import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import { analyzeSavedProfile } from '@/logic/profile';
import {
  addStep,
  buildBaseRoutine,
  buildShoppingNeeds,
  doneStepIds,
  markStep,
  moveStep,
  removeStep,
  ROUTINE_IDS,
} from '@/logic/routine';
import { useAppStore, useAppStoreApi } from '@/store';
import type { ProductCategory, Routine, Scenario, Slot } from '@/types';
import { localDate } from '../utils/today';

/**
 * Everything the care screens need: the saved profile and its analysis, the routine, the list
 * of needs and the actions. The routine and the marks live in the store; what is explained
 * (purposes, warnings, needs) is calculated again from the content and the profile.
 */
export function useCare() {
  const { content, clock, ids } = useServices();
  const store = useAppStoreApi();
  const profile = useAppStore((state) => state.profile);
  const setup = useAppStore((state) => state.careSetup);
  const routines = useAppStore((state) => state.routine);
  const log = useAppStore((state) => state.routineLog);
  const needStates = useAppStore((state) => state.needs);
  const products = useAppStore((state) => state.products);
  const testAnswers = useAppStore((state) => state.testDraft.answers);
  const bundle = content.bundle;

  const analysis = useMemo(
    () => (profile ? analyzeSavedProfile(profile, testAnswers, bundle, clock.now()) : null),
    [profile, testAnswers, bundle, clock],
  );

  const notes = useMemo(
    () =>
      profile && analysis
        ? buildBaseRoutine(profile, analysis, setup.ownedCategories, bundle).notes
        : [],
    [profile, analysis, setup.ownedCategories, bundle],
  );

  const needs = useMemo(
    () =>
      profile && analysis && routines.length > 0
        ? buildShoppingNeeds(routines, products, profile, analysis, bundle)
        : [],
    [profile, analysis, routines, products, bundle],
  );

  const today = localDate(clock.now());

  /** Builds the routine for the answer about the care the user already has. */
  const build = (scenario: Scenario, owned: readonly ProductCategory[]) => {
    if (!profile || !analysis) return;
    // "No" and "Skip" start from scratch: nothing is owned.
    const ownedCategories = scenario === 'have' || scenario === 'partial' ? [...owned] : [];
    const built = buildBaseRoutine(profile, analysis, ownedCategories, bundle);
    const { actions } = store.getState();
    actions.routine.set(built.routines);
    actions.careSetup.set({ scenario, ownedCategories, builtForRevision: profile.revision });
  };

  /** Builds again for the same answer (for example after the profile changed). */
  const rebuild = () => {
    if (setup.scenario) build(setup.scenario, setup.ownedCategories);
  };

  const replace = (slot: Slot, change: (routine: Routine) => Routine) => {
    const current = store.getState().routine.find((routine) => routine.id === ROUTINE_IDS[slot]);
    if (current)
      store.getState().actions.routine.update(current.id, { steps: change(current).steps });
  };

  return {
    profile,
    analysis,
    setup,
    routines,
    notes,
    needs,
    needStates,
    today,
    doneIds: (slot: Slot) => doneStepIds(log, today, slot),
    build,
    rebuild,
    move: (slot: Slot, stepId: string, direction: 'up' | 'down') =>
      replace(slot, (routine) => moveStep(routine, stepId, direction)),
    remove: (slot: Slot, stepId: string) => replace(slot, (routine) => removeStep(routine, stepId)),
    add: (slot: Slot, category: ProductCategory) =>
      replace(slot, (routine) => addStep(routine, `user-${ids.next()}`, category)),
    setDone: (slot: Slot, stepId: string, done: boolean) => {
      const entry = markStep(
        store.getState().routineLog,
        localDate(clock.now()),
        slot,
        stepId,
        done,
      );
      store.getState().actions.routineLog.upsert(entry);
    },
    setNeedState: (id: string, patch: { done?: boolean; dismissed?: boolean }) => {
      const current = store.getState().needs.find((need) => need.id === id);
      store.getState().actions.needs.upsert({
        id,
        done: current?.done ?? false,
        dismissed: current?.dismissed ?? false,
        ...patch,
      });
    },
  };
}
