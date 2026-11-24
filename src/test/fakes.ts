import type { Clock, IdGenerator, Logger } from '@/lib/ports';
import type { Services } from '@/lib/services';
import { createMemoryAdapter } from '@/lib/storage';

// Fakes for tests: deterministic time and ids, in-memory storage, silent logger.

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

export function createTestServices(overrides: Partial<Services> = {}): Services {
  return {
    storage: createMemoryAdapter(),
    clock: createFixedClock(),
    ids: createSequentialIds(),
    logger: createSilentLogger(),
    ...overrides,
  };
}
