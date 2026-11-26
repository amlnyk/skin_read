import { createHttpLabelReader } from '@/lib/ai';
import { systemClock } from '@/lib/clock';
import type { Env } from '@/lib/env';
import { browserImageDeps } from '@/lib/image';
import { createIdbBackend, createPhotoStore } from '@/lib/idb';
import { createCryptoIdGenerator } from '@/lib/ids';
import { createConsoleLogger } from '@/lib/logger';
import type { ContentProvider } from '@/lib/ports';
import type { Services } from '@/lib/services';
import { createLocalStorageAdapter, createMemoryAdapter } from '@/lib/storage';
import { createAppStore, type AppStore } from '@/store';

// The only place where concrete adapters are chosen.
// Tests build their own Services from fakes (src/test/helpers/fakes.ts).
export function createServices(env: Env, content: ContentProvider): Services {
  return {
    // Review mode keeps the data in memory: a reload starts from the loading screen and the
    // onboarding, and whatever the device saved before is left untouched.
    storage: env.freshStart ? createMemoryAdapter() : createLocalStorageAdapter(),
    clock: systemClock,
    ids: createCryptoIdGenerator(),
    logger: createConsoleLogger(env.appEnv === 'development' ? 'debug' : 'warn'),
    content,
    labelReader: createHttpLabelReader(),
    imageDeps: browserImageDeps,
    photos: createPhotoStore(createIdbBackend()),
    features: { photoScan: env.features.photoScan },
  };
}

export type Composition = { readonly services: Services; readonly store: AppStore };

// Services plus the store that saves its data through services.storage.
export function createComposition(env: Env, content: ContentProvider): Composition {
  const services = createServices(env, content);
  return { services, store: createAppStore(services.storage) };
}
