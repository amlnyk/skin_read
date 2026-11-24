import { systemClock } from '@/lib/clock';
import type { Env } from '@/lib/env';
import { createCryptoIdGenerator } from '@/lib/ids';
import { createConsoleLogger } from '@/lib/logger';
import type { Services } from '@/lib/services';
import { createLocalStorageAdapter } from '@/lib/storage';

// The only place where concrete adapters are chosen.
// Tests build their own Services from fakes (src/test/fakes.ts).
export function createServices(env: Env): Services {
  return {
    storage: createLocalStorageAdapter(),
    clock: systemClock,
    ids: createCryptoIdGenerator(),
    logger: createConsoleLogger(env.appEnv === 'development' ? 'debug' : 'warn'),
  };
}
