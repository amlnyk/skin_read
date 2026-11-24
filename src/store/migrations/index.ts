// Storage migrations. Every change of the saved data shape raises STORE_VERSION and adds a
// function vN -> vN+1 here, together with a test on a fixture of the old data.
export const STORE_VERSION = 2;

type Migration = (state: unknown) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Version 1 -> 2 (stage 5):
// - a new slice `careSetup` (the answer about the routine the user already has);
// - `needs` keeps only what the user did with an item (done, removed): the texts and the
//   priorities are calculated now. The old stage 1 records were never filled by the app.
// The step is written so that it can run twice on the same data without harm.
const toVersion2: Migration = (state) => {
  if (!isRecord(state)) return state;
  const needs = Array.isArray(state['needs']) ? state['needs'] : [];
  return {
    ...state,
    careSetup: state['careSetup'] ?? {
      scenario: null,
      ownedCategories: [],
      builtForRevision: null,
    },
    needs: needs.filter(isRecord).map((need) => ({
      id: need['id'],
      done: need['done'] === true,
      dismissed: need['dismissed'] === true,
    })),
  };
};

const steps: Readonly<Record<number, Migration>> = { 1: toVersion2 };

/** Brings saved data of an older version to the current shape. Never drops data on its own. */
export function migrate(persisted: unknown, fromVersion: number): unknown {
  let state = persisted;
  for (let version = fromVersion; version < STORE_VERSION; version += 1) {
    const step = steps[version];
    if (step) state = step(state);
  }
  return state;
}
