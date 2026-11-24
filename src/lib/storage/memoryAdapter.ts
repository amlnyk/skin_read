import { ok } from '../result';
import type { StorageAdapter } from '../ports';

// In-memory StorageAdapter: used in tests and as a fallback when localStorage is unavailable.
export function createMemoryAdapter(
  initial: Readonly<Record<string, string>> = {},
): StorageAdapter {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => ok(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return ok(undefined);
    },
    removeItem: (key) => {
      data.delete(key);
      return ok(undefined);
    },
  };
}
