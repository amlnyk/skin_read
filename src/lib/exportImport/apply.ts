import type { ExportFile, PersistedState } from '@/types';

/** What the user sees before confirming an import: a short list, never the data itself. */
export type ImportSummary = {
  exportedAt: string;
  hasProfile: boolean;
  journalCount: number;
  productsCount: number;
  scansCount: number;
  /** The photo consent written in the file. */
  fileConsentGranted: boolean;
};

export function summarizeImport(file: ExportFile): ImportSummary {
  const { data } = file;
  return {
    exportedAt: file.exportedAt,
    hasProfile: data.profile !== null,
    journalCount: data.journal.length,
    productsCount: data.products.length,
    scansCount: data.scans.length,
    fileConsentGranted: data.settings.consents.photoToAi.granted,
  };
}

/** Does the file say something different about the photo consent than the device does now? */
export function consentsDiffer(current: PersistedState, file: ExportFile): boolean {
  return (
    current.settings.consents.photoToAi.granted !== file.data.settings.consents.photoToAi.granted
  );
}

/**
 * The state after the import. Everything comes from the file, except the consents: they stay as
 * they are on this device unless the user explicitly agreed to take them from the file.
 */
export function applyImport(
  current: PersistedState,
  file: ExportFile,
  options: { readonly replaceConsents: boolean },
): PersistedState {
  return {
    ...file.data,
    settings: {
      ...file.data.settings,
      consents: options.replaceConsents ? file.data.settings.consents : current.settings.consents,
    },
  };
}
