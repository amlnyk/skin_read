import type { PersistedState } from '@/schemas';

// Technical sample data for checking that saving works. It is NOT cosmetology content:
// names are obviously fake, and nothing here is shown outside /dev/state.
export function createExampleData(base: PersistedState, nowIso: string): PersistedState {
  return {
    ...base,
    onboarding: { completed: true },
    testDraft: {
      answers: { q1: 'a' },
      currentQuestionId: 'q2',
      startedAt: nowIso,
      updatedAt: nowIso,
    },
    products: [
      {
        id: 'example-product',
        name: 'Example product',
        category: 'other',
        inciRaw: 'Example composition',
        ingredients: [],
        compositionSource: 'manual',
        userReactions: [],
        addedAt: nowIso,
      },
    ],
    journal: [
      {
        id: 'example-entry',
        date: nowIso.slice(0, 10),
        symptoms: {},
        newProductIds: [],
        note: 'Example note',
      },
    ],
  };
}
