import { loadBundledContent } from '@/content';
import type { ContentBundle } from '@/schemas';
import { createMemoryBackend, createPhotoStore } from '@/lib/idb';
import type { DecodedImage, ImageDeps } from '@/lib/image';
import type {
  Clock,
  ContentProvider,
  IdGenerator,
  LabelReader,
  LabelReading,
  LabelReaderError,
  Logger,
  PhotoStore,
  StorageAdapter,
  StorageErrorCode,
} from '@/lib/ports';
import { err, ok, type Result } from '@/lib/result';
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
    routineSteps: [],
    observationTemplates: [],
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

/** Photos kept in memory (the real store works over IndexedDB, which jsdom does not have). */
export function createMemoryPhotoStore(): PhotoStore {
  return createPhotoStore(createMemoryBackend());
}

export type FakeImageDeps = ImageDeps & {
  readonly encoded: { width: number; height: number; quality: number }[];
};

/**
 * Image handling without a browser: every file "decodes" to the given size and every encoding
 * gives a JPEG blob of the given byte size (or one size per attempt).
 */
export function createFakeImageDeps(
  options: { width?: number; height?: number; sizes?: number[]; unreadable?: boolean } = {},
): FakeImageDeps {
  const encoded: { width: number; height: number; quality: number }[] = [];
  const sizes = options.sizes ?? [1_000];
  return {
    encoded,
    decode: () => {
      if (options.unreadable) return Promise.resolve(null);
      const image: DecodedImage = {
        width: options.width ?? 3000,
        height: options.height ?? 2000,
        release: () => undefined,
      };
      return Promise.resolve(image);
    },
    encode: (_image, width, height, quality) => {
      encoded.push({ width, height, quality });
      const size = sizes[Math.min(encoded.length - 1, sizes.length - 1)] ?? 1_000;
      return Promise.resolve(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }));
    },
  };
}

export type FakeLabelReader = LabelReader & { readonly calls: Blob[] };

/** A label reader that answers with a fixed result (or what a function returns) and counts calls. */
export function createFakeLabelReader(
  answer:
    | Result<LabelReading, LabelReaderError>
    | ((image: Blob) => Promise<Result<LabelReading, LabelReaderError>>) = err({
    code: 'UNAVAILABLE',
  }),
): FakeLabelReader {
  const calls: Blob[] = [];
  return {
    calls,
    analyze: (image) => {
      calls.push(image);
      return typeof answer === 'function' ? answer(image) : Promise.resolve(answer);
    },
  };
}

export const sampleReading: LabelReading = {
  ingredientsText: 'Aqua, Glycerin, Panthenol',
  productName: 'Calm cream',
  brand: 'Test brand',
  categoryGuess: 'moisturizer',
  language: 'en',
  confidence: 0.9,
};

export const readingOk = (patch: Partial<LabelReading> = {}) => ok({ ...sampleReading, ...patch });

export function createTestServices(overrides: Partial<Services> = {}): Services {
  return {
    storage: createMemoryAdapter(),
    clock: createFixedClock(),
    ids: createSequentialIds(),
    logger: createSilentLogger(),
    content: createTestContent(),
    labelReader: createFakeLabelReader(),
    imageDeps: createFakeImageDeps(),
    photos: createMemoryPhotoStore(),
    features: { photoScan: false },
    ...overrides,
  };
}

/** A store over fresh in-memory storage. Pass an adapter to share or pre-fill storage. */
export function createTestStore(adapter: Services['storage'] = createMemoryAdapter()): AppStore {
  return createAppStore(adapter);
}
