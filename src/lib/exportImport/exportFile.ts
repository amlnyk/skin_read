import { EXPORT_APP } from '@/schemas';
import type { ExportFile, PersistedState } from '@/types';

/** Wraps everything the app saves into the file envelope. */
export function createExport(
  data: PersistedState,
  schemaVersion: number,
  nowMs: number,
): ExportFile {
  return { app: EXPORT_APP, schemaVersion, exportedAt: new Date(nowMs).toISOString(), data };
}

/** The text of the file: readable JSON (2 spaces), so the user can look inside. */
export function serializeExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2);
}

/** `skin-barrier-2026-01-15.json` */
export function exportFileName(nowMs: number): string {
  return `${EXPORT_APP}-${new Date(nowMs).toISOString().slice(0, 10)}.json`;
}
