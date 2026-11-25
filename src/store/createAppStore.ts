import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { persistedStateSchema, type PersistedState } from '@/schemas';
import type { StorageAdapter } from '@/lib/ports';
import { createInitialData } from './initialData';
import { migrate, STORE_VERSION } from './migrations';
import type { AppActions, AppState, Collection, PersistenceStatus } from './types';

export const STORAGE_KEY = 'skinbarrier:v1';

export type AppStore = StoreApi<AppState>;

/** The part of the state that is saved (everything except `actions` and `persistence`). */
export function pickPersisted(state: AppState): PersistedState {
  return {
    onboarding: state.onboarding,
    testDraft: state.testDraft,
    profile: state.profile,
    careSetup: state.careSetup,
    routine: state.routine,
    routineLog: state.routineLog,
    products: state.products,
    scans: state.scans,
    journal: state.journal,
    needs: state.needs,
    settings: state.settings,
  };
}

// The same four actions for every list of records that have an `id`.
function makeCollection<T extends { id: string }>(
  read: () => T[],
  write: (items: T[]) => void,
): Collection<T> {
  return {
    set: (items) => write(items),
    add: (item) => write([...read(), item]),
    update: (id, patch) =>
      write(read().map((item) => (item.id === id ? { ...item, ...patch } : item))),
    remove: (id) => write(read().filter((item) => item.id !== id)),
  };
}

function isEnvelope(value: unknown): value is StorageValue<PersistedState> {
  return typeof value === 'object' && value !== null && 'state' in value;
}

function sameStatus(a: PersistenceStatus, b: PersistenceStatus): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'memory_only' && b.kind === 'memory_only') return a.reason === b.reason;
  return true;
}

/**
 * The application store: Zustand + persist into the given StorageAdapter.
 *
 * Safety rules:
 * - saved data is validated with zod; if it cannot be read, nothing is overwritten
 *   (writes are paused) until the user downloads a copy and chooses "reset";
 * - if the storage is unavailable or full, the app keeps working in memory
 *   (persistence.kind === 'memory_only').
 */
export function createAppStore(adapter: StorageAdapter, key: string = STORAGE_KEY): AppStore {
  let status: PersistenceStatus = { kind: 'ok' };
  let lastRaw: string | null = null;
  const ref: { store?: AppStore } = {};

  const setStatus = (next: PersistenceStatus) => {
    if (sameStatus(status, next)) return;
    status = next;
    // Before the store exists (during hydration) the status is picked up by `merge` below.
    ref.store?.setState({ persistence: next });
  };

  const storage: PersistStorage<PersistedState> = {
    getItem: (name) => {
      const result = adapter.getItem(name);
      if (!result.ok) {
        status = { kind: 'memory_only', reason: result.error.code };
        return null;
      }
      if (result.value === null) return null;
      lastRaw = result.value;
      try {
        const parsed: unknown = JSON.parse(result.value);
        if (isEnvelope(parsed)) return parsed;
      } catch {
        // falls through to the corrupt branch
      }
      status = { kind: 'corrupt', rawCopy: result.value };
      return null;
    },
    setItem: (name, value) => {
      // Never overwrite data that could not be read.
      if (status.kind === 'corrupt') return;
      const result = adapter.setItem(name, JSON.stringify(value));
      if (result.ok) {
        if (status.kind === 'memory_only') setStatus({ kind: 'ok' });
      } else {
        setStatus({ kind: 'memory_only', reason: result.error.code });
      }
    },
    removeItem: (name) => {
      adapter.removeItem(name);
    },
  };

  const created = createStore<AppState>()(
    persist(
      (set, get): AppState => {
        const actions: AppActions = {
          onboarding: {
            set: (patch) => set({ onboarding: { ...get().onboarding, ...patch } }),
            complete: () => set({ onboarding: { ...get().onboarding, completed: true } }),
          },
          testDraft: {
            set: (draft) => set({ testDraft: draft }),
            update: (patch) => set({ testDraft: { ...get().testDraft, ...patch } }),
            clear: () => set({ testDraft: createInitialData().testDraft }),
          },
          profile: {
            set: (profile) => set({ profile }),
            update: (patch) => {
              const current = get().profile;
              if (current) set({ profile: { ...current, ...patch } });
            },
            remove: () => set({ profile: null }),
          },
          careSetup: {
            set: (careSetup) => set({ careSetup }),
            update: (patch) => set({ careSetup: { ...get().careSetup, ...patch } }),
          },
          routine: makeCollection(
            () => get().routine,
            (routine) => set({ routine }),
          ),
          routineLog: {
            set: (entries) => set({ routineLog: entries }),
            upsert: (entry) =>
              set({
                routineLog: [
                  ...get().routineLog.filter(
                    (e) => !(e.date === entry.date && e.slot === entry.slot),
                  ),
                  entry,
                ],
              }),
            remove: (date, slot) =>
              set({
                routineLog: get().routineLog.filter((e) => !(e.date === date && e.slot === slot)),
              }),
          },
          products: makeCollection(
            () => get().products,
            (products) => set({ products }),
          ),
          scans: makeCollection(
            () => get().scans,
            (scans) => set({ scans }),
          ),
          journal: makeCollection(
            () => get().journal,
            (journal) => set({ journal }),
          ),
          needs: {
            ...makeCollection(
              () => get().needs,
              (needs) => set({ needs }),
            ),
            upsert: (item) =>
              set({ needs: [...get().needs.filter((need) => need.id !== item.id), item] }),
          },
          settings: {
            set: (settings) => set({ settings }),
            update: (patch) => set({ settings: { ...get().settings, ...patch } }),
          },
          resetAll: () => set(createInitialData()),
          replaceAll: (data) => set({ ...data }),
          discardCorruptedData: () => {
            adapter.removeItem(key);
            status = { kind: 'ok' };
            set({ ...createInitialData(), persistence: status });
          },
        };

        return { ...createInitialData(), persistence: status, actions };
      },
      {
        name: key,
        version: STORE_VERSION,
        storage,
        partialize: pickPersisted,
        migrate: (persisted, version) => migrate(persisted, version) as PersistedState,
        merge: (persisted, current) => {
          if (persisted === undefined || persisted === null) {
            return { ...current, persistence: status };
          }
          const parsed = persistedStateSchema.safeParse(persisted);
          if (!parsed.success) {
            status = { kind: 'corrupt', rawCopy: lastRaw ?? JSON.stringify(persisted) };
            return { ...current, persistence: status };
          }
          return { ...current, ...parsed.data, persistence: status };
        },
      },
    ),
  );

  ref.store = created;
  return created;
}
