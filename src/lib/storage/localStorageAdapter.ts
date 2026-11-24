import { err, ok } from '../result';
import type { StorageAdapter, StorageError } from '../ports';

function toStorageError(error: unknown): StorageError {
  if (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return { code: 'quota' };
  }
  return { code: 'unknown' };
}

// Reading window.localStorage itself can throw (blocked cookies, some private modes).
function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

// Pass `null` to get an adapter that reports "unavailable" (omit the argument for the real one).
export function createLocalStorageAdapter(
  storage: Storage | null = getBrowserStorage(),
): StorageAdapter {
  const unavailable = () => err<StorageError>({ code: 'unavailable' });
  return {
    getItem(key) {
      if (!storage) return unavailable();
      try {
        return ok(storage.getItem(key));
      } catch (error) {
        return err(toStorageError(error));
      }
    },
    setItem(key, value) {
      if (!storage) return unavailable();
      try {
        storage.setItem(key, value);
        return ok(undefined);
      } catch (error) {
        return err(toStorageError(error));
      }
    },
    removeItem(key) {
      if (!storage) return unavailable();
      try {
        storage.removeItem(key);
        return ok(undefined);
      } catch (error) {
        return err(toStorageError(error));
      }
    },
  };
}
