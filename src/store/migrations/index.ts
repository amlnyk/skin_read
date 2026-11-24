// Storage migrations. Every change of the saved data shape raises STORE_VERSION and adds a
// function vN -> vN+1 here, together with a test on a fixture of the old data.
export const STORE_VERSION = 1;

type Migration = (state: unknown) => unknown;

// Version 1 is the first one: there is nothing to migrate yet.
const steps: Readonly<Record<number, Migration>> = {};

/** Brings saved data of an older version to the current shape. Never drops data on its own. */
export function migrate(persisted: unknown, fromVersion: number): unknown {
  let state = persisted;
  for (let version = fromVersion; version < STORE_VERSION; version += 1) {
    const step = steps[version];
    if (step) state = step(state);
  }
  return state;
}
