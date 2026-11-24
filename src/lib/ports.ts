import type { ContentProvider } from '@/types';
import type { Result } from './result';

// Ports: everything that leaves pure logic (storage, time, randomness, network, logging)
// is behind an interface here. Implementations are chosen in app/compositionRoot.ts,
// and replaced by fakes in tests.

// ---- Storage ----
export type StorageErrorCode = 'unavailable' | 'quota' | 'unknown';
export type StorageError = { readonly code: StorageErrorCode };

export interface StorageAdapter {
  getItem(key: string): Result<string | null, StorageError>;
  setItem(key: string, value: string): Result<void, StorageError>;
  removeItem(key: string): Result<void, StorageError>;
}

// ---- Time and ids (passed into logic as arguments) ----
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}

export interface IdGenerator {
  next(): string;
}

// ---- Logging ----
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/** Codes and counters only. Never put personal data, ingredient lists or photos here. */
export type LogContext = Readonly<Record<string, string | number | boolean>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

// ---- Content ----
// The shape lives in @/types (it is built from the zod schemas); re-exported here so that
// all ports can be found in one place.
export type { ContentProvider };

// ---- Label reader (photo -> ingredients text, server side AI) ----
// Codes are refined at the photo-scan stage according to docs/API.md.
export type LabelReaderErrorCode =
  'NETWORK' | 'RATE_LIMITED' | 'NO_INGREDIENTS_FOUND' | 'UNAVAILABLE';
export type LabelReaderError = { readonly code: LabelReaderErrorCode };

export interface LabelReader {
  readIngredients(
    image: Blob,
  ): Promise<Result<{ readonly ingredientsText: string }, LabelReaderError>>;
}
