import type { PersistedState } from '@/schemas';

// A fresh copy on every call: resetAll must never share objects between calls.
export function createInitialData(): PersistedState {
  return {
    onboarding: { completed: false },
    testDraft: { answers: {}, currentQuestionId: null, startedAt: null, updatedAt: null },
    profile: null,
    careSetup: { scenario: null, ownedCategories: [], builtForRevision: null },
    routine: [],
    routineLog: [],
    products: [],
    scans: [],
    journal: [],
    needs: [],
    settings: {
      // Nothing is allowed by default: the photo consent is given explicitly later.
      consents: { photoToAi: { granted: false, at: null } },
      reminders: {
        am: { enabled: false, time: null },
        pm: { enabled: false, time: null },
        journal: { enabled: false, time: null },
      },
      cycleTrackingVisible: false,
      showShavingField: false,
    },
  };
}
