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

// ---- Label reader (photo -> text of the composition, by an AI service on the server) ----
// The codes are the ones the screen can explain; see docs/API.md for how the server codes map.
export type LabelReaderErrorCode =
  | 'NETWORK' // no connection
  | 'TIMEOUT' // no answer in time
  | 'RATE_LIMITED' // too many requests
  | 'NO_INGREDIENTS_FOUND' // the photo has no readable composition
  | 'IMAGE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'BAD_REQUEST'
  | 'BAD_RESPONSE' // the service answered, but not in a usable way
  | 'UNAVAILABLE'; // the service is off, not set up, or refuses
export type LabelReaderError = { readonly code: LabelReaderErrorCode };

/** What was read from the label. The composition text is always there; the rest may be null. */
export type LabelReading = {
  readonly ingredientsText: string;
  readonly productName: string | null;
  readonly brand: string | null;
  readonly categoryGuess: string | null;
  readonly language: string;
  /** 0..1: how legible the list was, as the service judged it. */
  readonly confidence: number;
};

export interface LabelReader {
  analyze(image: Blob): Promise<Result<LabelReading, LabelReaderError>>;
}

// ---- Photos kept on the device (only when the user chooses so) ----
export type PhotoStoreErrorCode = 'unavailable' | 'quota' | 'unknown';
export type PhotoStoreError = { readonly code: PhotoStoreErrorCode };

/** Photos of products, by product id. They never leave the device and are not in the export. */
export interface PhotoStore {
  put(id: string, photo: Blob): Promise<Result<void, PhotoStoreError>>;
  get(id: string): Promise<Result<Blob | null, PhotoStoreError>>;
  remove(id: string): Promise<Result<void, PhotoStoreError>>;
  keys(): Promise<Result<string[], PhotoStoreError>>;
  /** Deletes every photo whose id is not in the list. */
  retainOnly(ids: readonly string[]): Promise<Result<void, PhotoStoreError>>;
  clear(): Promise<Result<void, PhotoStoreError>>;
}
