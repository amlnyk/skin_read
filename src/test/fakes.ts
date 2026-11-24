import { loadBundledContent } from '@/content';
import type { ContentBundle } from '@/schemas';
import type {
  Clock,
  ContentProvider,
  IdGenerator,
  Logger,
  StorageAdapter,
  StorageErrorCode,
} from '@/lib/ports';
import { err } from '@/lib/result';
import type { Services } from '@/lib/services';
import { createLocalStorageAdapter, createMemoryAdapter } from '@/lib/storage';
import { createAppStore, type AppStore } from '@/store';

// Fakes for tests: deterministic time and ids, in-memory storage, silent logger.
// Tests of layers that may not import lib/storage take their adapters from here.

export { createMemoryAdapter };

/** Storage that is not there at all (localStorage blocked, private mode). */
export function createUnavailableAdapter(): StorageAdapter {
  return createLocalStorageAdapter(null);
}

/** The real jsdom localStorage. */
export function createJsdomStorageAdapter(): StorageAdapter {
  return createLocalStorageAdapter(window.localStorage);
}

export function createFixedClock(nowMs = 0): Clock {
  return { now: () => nowMs };
}

export function createSequentialIds(prefix = 'id'): IdGenerator {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export function createSilentLogger(): Logger {
  const noop = () => undefined;
  return { debug: noop, info: noop, warn: noop, error: noop };
}

export function createEmptyBundle(): ContentBundle {
  return {
    questionnaire: [],
    skinTypes: [],
    conditions: [],
    recommendations: [],
    ingredientGroups: [],
    ingredients: [],
    compatRules: [],
    safetyMessages: [],
    productCategories: [],
  };
}

export function createTestContent(overrides: Partial<ContentProvider> = {}): ContentProvider {
  return { policy: 'demo', version: 'test', bundle: createEmptyBundle(), ...overrides };
}

/** Storage that reads fine but refuses every write (for example a full localStorage). */
export function createWriteFailingAdapter(code: StorageErrorCode = 'quota'): StorageAdapter {
  const inner = createMemoryAdapter();
  return {
    getItem: (key) => inner.getItem(key),
    setItem: () => err({ code }),
    removeItem: (key) => inner.removeItem(key),
  };
}

/** The real questionnaire and content files, filtered by the policy (demo by default). */
export function createRealContent(policy: ContentProvider['policy'] = 'demo'): ContentProvider {
  const loaded = loadBundledContent(policy);
  if (!loaded.ok) throw new Error('the bundled content must load in tests');
  return loaded.value;
}

export function createTestServices(overrides: Partial<Services> = {}): Services {
  return {
    storage: createMemoryAdapter(),
    clock: createFixedClock(),
    ids: createSequentialIds(),
    logger: createSilentLogger(),
    content: createTestContent(),
    ...overrides,
  };
}

/** A store over fresh in-memory storage. Pass an adapter to share or pre-fill storage. */
export function createTestStore(adapter: Services['storage'] = createMemoryAdapter()): AppStore {
  return createAppStore(adapter);
}
