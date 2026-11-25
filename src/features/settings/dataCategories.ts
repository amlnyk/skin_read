import { withoutCyclePeriod } from '@/logic/journal';
import { QUESTION_IDS } from '@/schemas';
import type { PersistedState, ProductCategory, RoutineStep } from '@/types';

/** The groups of data the user can delete one by one. */
export type DataCategory = 'journal' | 'scans' | 'collection' | 'cycle';
export const DATA_CATEGORIES: readonly DataCategory[] = ['journal', 'scans', 'collection', 'cycle'];

// The saved answers of the test about the cycle (and the texts typed into their "other" options).
const CYCLE_QUESTIONS: readonly string[] = [QUESTION_IDS.cycle, QUESTION_IDS.cycleEffects];
const isCycleAnswerKey = (key: string) =>
  CYCLE_QUESTIONS.some((id) => key === id || key.startsWith(`${id}:`));

/** A step that lost its product goes back to what it was before the product was attached. */
function detachStep(step: RoutineStep, owned: readonly ProductCategory[]): RoutineStep {
  if (step.productId === undefined) return step;
  const detached = { ...step };
  delete detached.productId;
  detached.status = owned.includes(step.category)
    ? 'owned'
    : step.contentId !== undefined
      ? 'optional'
      : 'to_choose';
  return detached;
}

/** Does the profile hold anything about the cycle? */
export function hasCycleData(state: PersistedState): boolean {
  const cycle = state.profile?.cycle;
  return (
    (cycle !== undefined &&
      (cycle.status !== null || cycle.phases.length > 0 || cycle.effects.length > 0)) ||
    state.journal.some((entry) => entry.cyclePeriod !== undefined) ||
    Object.keys(state.testDraft.answers).some(isCycleAnswerKey)
  );
}

/**
 * The state after deleting one category. Everything else stays as it is.
 * - journal: all entries;
 * - scans: the history of checks;
 * - collection: all products, and everything that points at them (steps of the routine keep
 *   their place but lose the product, entries of the journal lose "new products");
 * - cycle: the cycle in the profile (revision +1, like every confirmed change of the profile),
 *   the saved answers about it, the cycle period in every journal entry and the switch that
 *   showed the field. The sex stays: the profile screen has its own button for it.
 */
export function deleteCategory(
  state: PersistedState,
  category: DataCategory,
  nowIso: string,
): PersistedState {
  switch (category) {
    case 'journal':
      return { ...state, journal: [] };
    case 'scans':
      return { ...state, scans: [] };
    case 'collection':
      return {
        ...state,
        products: [],
        routine: state.routine.map((routine) => ({
          ...routine,
          steps: routine.steps.map((step) => detachStep(step, state.careSetup.ownedCategories)),
        })),
        journal: state.journal.map((entry) =>
          entry.newProductIds.length > 0 ? { ...entry, newProductIds: [] } : entry,
        ),
      };
    case 'cycle': {
      const { profile } = state;
      const profileHasCycle =
        profile !== null &&
        (profile.cycle.status !== null ||
          profile.cycle.phases.length > 0 ||
          profile.cycle.effects.length > 0);
      return {
        ...state,
        profile:
          profile !== null && profileHasCycle
            ? {
                ...profile,
                cycle: { status: null, phases: [], effects: [] },
                revision: profile.revision + 1,
                updatedAt: nowIso,
              }
            : profile,
        testDraft: {
          ...state.testDraft,
          answers: Object.fromEntries(
            Object.entries(state.testDraft.answers).filter(([key]) => !isCycleAnswerKey(key)),
          ),
        },
        journal: withoutCyclePeriod(state.journal),
        settings: { ...state.settings, cycleTrackingVisible: false },
      };
    }
  }
}

/** How much of each kind is saved: the numbers behind "What is stored". */
export type DataSummary = {
  hasProfile: boolean;
  testAnswers: number;
  routineSteps: number;
  products: number;
  scans: number;
  journal: number;
};

export function summarizeData(state: PersistedState): DataSummary {
  return {
    hasProfile: state.profile !== null,
    testAnswers: Object.keys(state.testDraft.answers).length,
    routineSteps: state.routine.reduce((sum, routine) => sum + routine.steps.length, 0),
    products: state.products.length,
    scans: state.scans.length,
    journal: state.journal.length,
  };
}
