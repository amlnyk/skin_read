import { err, ok, type Result } from '../result';
import { EXPORT_APP, exportFileSchema } from '@/schemas';
import type { ExportFile } from '@/types';

/** A file bigger than this is refused before it is even read. */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ImportErrorCode =
  | 'WRONG_TYPE' // not a .json file
  | 'TOO_LARGE'
  | 'EMPTY'
  | 'NOT_JSON'
  | 'NOT_SKIN_BARRIER' // JSON, but not an export of this app
  | 'NEWER_VERSION' // made by a newer version of the app
  | 'INVALID_DATA'; // the shape does not fit the schema
export type ImportError = { readonly code: ImportErrorCode };

/** What the browser tells about a chosen file (name, size in bytes, MIME type). */
export type FileMeta = { readonly name: string; readonly size: number; readonly type: string };

const JSON_TYPES = new Set(['', 'application/json', 'text/json']);

/**
 * Step 1: look at the file before reading it. Only `.json` of at most 5 MB is accepted.
 * Windows often gives an empty type for .json, so an empty type is fine; a picture or a
 * script renamed to .json still fails later, at the JSON and schema steps.
 */
export function checkImportFile(meta: FileMeta): Result<void, ImportError> {
  if (!meta.name.toLowerCase().endsWith('.json') || !JSON_TYPES.has(meta.type)) {
    return err({ code: 'WRONG_TYPE' });
  }
  if (meta.size > IMPORT_MAX_BYTES) return err({ code: 'TOO_LARGE' });
  if (meta.size === 0) return err({ code: 'EMPTY' });
  return ok(undefined);
}

/** Brings saved data of an older version to the current shape (the store's `migrate`). */
export type MigrateFn = (data: unknown, fromVersion: number) => unknown;

export type ParseOptions = {
  /** The version of the data this build saves. */
  readonly currentVersion: number;
  readonly migrate: MigrateFn;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Step 2: the text of the file becomes data, or an error. Nothing is executed, nothing is
 * changed: the caller applies the result only after the user has confirmed it.
 * Order: size of the text, JSON.parse in try/catch, the envelope, the version, then zod.
 * Fields that the schema does not know are dropped by zod.
 */
export function parseImport(text: string, options: ParseOptions): Result<ExportFile, ImportError> {
  // `text.length` counts characters; a file of IMPORT_MAX_BYTES bytes has at most that many.
  if (text.length > IMPORT_MAX_BYTES) return err({ code: 'TOO_LARGE' });
  if (text.trim() === '') return err({ code: 'EMPTY' });

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return err({ code: 'NOT_JSON' });
  }

  if (!isRecord(parsed) || parsed['app'] !== EXPORT_APP) return err({ code: 'NOT_SKIN_BARRIER' });
  const version = parsed['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return err({ code: 'INVALID_DATA' });
  }
  if (version > options.currentVersion) return err({ code: 'NEWER_VERSION' });

  const migrated =
    version < options.currentVersion ? options.migrate(parsed['data'], version) : parsed['data'];
  const checked = exportFileSchema.safeParse({
    ...parsed,
    schemaVersion: options.currentVersion,
    data: migrated,
  });
  return checked.success ? ok(checked.data) : err({ code: 'INVALID_DATA' });
}
