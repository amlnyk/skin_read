import {
  createStore,
  clear as idbClear,
  del,
  get,
  keys as idbKeys,
  set,
  type UseStore,
} from 'idb-keyval';
import type { PhotoStore, PhotoStoreError, PhotoStoreErrorCode } from '../ports';
import { err, ok, type Result } from '../result';

// Photos kept on the device only when the user chooses so. They live in IndexedDB (a photo does
// not fit in localStorage), under the id of the product. They are never sent anywhere and are
// not part of the exported file. The storage itself is behind KeyValueBackend, so tests (and a
// browser without IndexedDB) use a memory one.

export interface KeyValueBackend {
  get(key: string): Promise<Blob | undefined>;
  set(key: string, value: Blob): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export function createMemoryBackend(): KeyValueBackend {
  const map = new Map<string, Blob>();
  return {
    get: (key) => Promise.resolve(map.get(key)),
    set: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    del: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
    keys: () => Promise.resolve([...map.keys()]),
    clear: () => {
      map.clear();
      return Promise.resolve();
    },
  };
}

const DB_NAME = 'skinbarrier';
const STORE_NAME = 'photos';

/**
 * IndexedDB through idb-keyval. The database is opened at the first use, not at the start,
 * so a browser that has no IndexedDB (private mode, an old engine) only fails when a photo
 * is really asked for, and the failure is a value.
 */
export function createIdbBackend(): KeyValueBackend {
  let store: UseStore | null = null;
  const openStore = (): UseStore => {
    store ??= createStore(DB_NAME, STORE_NAME);
    return store;
  };
  return {
    get: async (key) => (await get<Blob>(key, openStore())) ?? undefined,
    set: (key, value) => set(key, value, openStore()),
    del: (key) => del(key, openStore()),
    keys: async () =>
      (await idbKeys(openStore())).filter((key): key is string => typeof key === 'string'),
    clear: () => idbClear(openStore()),
  };
}

function codeOf(error: unknown): PhotoStoreErrorCode {
  if (error instanceof Error) {
    if (error.name === 'QuotaExceededError') return 'quota';
    if (error.name === 'SecurityError' || error.name === 'InvalidStateError') return 'unavailable';
  }
  // no IndexedDB at all is a ReferenceError ("indexedDB is not defined")
  if (error instanceof ReferenceError) return 'unavailable';
  return 'unknown';
}

async function guarded<T>(run: () => Promise<T>): Promise<Result<T, PhotoStoreError>> {
  try {
    return ok(await run());
  } catch (error) {
    return err({ code: codeOf(error) });
  }
}

export function createPhotoStore(backend: KeyValueBackend): PhotoStore {
  return {
    put: (id, photo) => guarded(() => backend.set(id, photo)),
    get: (id) => guarded(async () => (await backend.get(id)) ?? null),
    remove: (id) => guarded(() => backend.del(id)),
    keys: () => guarded(() => backend.keys()),
    retainOnly: (ids) =>
      guarded(async () => {
        const keep = new Set(ids);
        for (const key of await backend.keys()) {
          if (!keep.has(key)) await backend.del(key);
        }
      }),
    clear: () => guarded(() => backend.clear()),
  };
}
