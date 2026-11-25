import { describe, expect, it } from 'vitest';
import valid from '@fixtures/persisted-valid.json';
import { persistedStateSchema } from '@/schemas';
import type { PersistedState } from '@/types';
import {
  applyImport,
  checkImportFile,
  consentsDiffer,
  createExport,
  exportFileName,
  IMPORT_MAX_BYTES,
  parseImport,
  serializeExport,
  summarizeImport,
  type ParseOptions,
} from './index';

const NOW = Date.UTC(2026, 0, 15, 12, 30);
const state: PersistedState = persistedStateSchema.parse(valid);
const identity: ParseOptions = { currentVersion: 3, migrate: (data) => data };

const fileOf = (data: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    app: 'skin-barrier',
    schemaVersion: 3,
    exportedAt: '2026-01-15T12:30:00.000Z',
    data,
    ...extra,
  });

function codeOf(text: string, options: ParseOptions = identity): string {
  const result = parseImport(text, options);
  return result.ok ? 'ok' : result.error.code;
}

describe('export', () => {
  it('has the envelope { app, schemaVersion, exportedAt, data } and the whole state in data', () => {
    const file = createExport(state, 3, NOW);
    expect(file.app).toBe('skin-barrier');
    expect(file.schemaVersion).toBe(3);
    expect(file.exportedAt).toBe('2026-01-15T12:30:00.000Z');
    expect(file.data).toBe(state);
  });

  it('is readable JSON and the name carries the date', () => {
    const text = serializeExport(createExport(state, 3, NOW));
    expect(text).toContain('\n  "app": "skin-barrier"');
    expect(exportFileName(NOW)).toBe('skin-barrier-2026-01-15.json');
  });
});

describe('export and import lose nothing', () => {
  it('what was exported comes back identical', () => {
    const text = serializeExport(createExport(state, 3, NOW));
    const result = parseImport(text, identity);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data).toEqual(state);
      expect(result.value.exportedAt).toBe('2026-01-15T12:30:00.000Z');
    }
  });

  it('keeps non-ASCII text, line breaks and quotes in notes', () => {
    const note = 'Сухість перед циклом, «лапки» і "лапки",\nдругий рядок 🌿';
    const withNote: PersistedState = {
      ...state,
      journal: [
        {
          ...(state.journal[0] ?? { id: 'e', date: '2026-01-01', symptoms: {}, newProductIds: [] }),
          note,
        },
      ],
    };
    const result = parseImport(serializeExport(createExport(withNote, 3, NOW)), identity);
    expect(result.ok && result.value.data.journal[0]?.note).toBe(note);
  });

  it('an empty state is also exported and imported', () => {
    const empty = persistedStateSchema.parse({
      ...state,
      profile: null,
      routine: [],
      routineLog: [],
      products: [],
      scans: [],
      journal: [],
      needs: [],
    });
    const result = parseImport(serializeExport(createExport(empty, 3, NOW)), identity);
    expect(result.ok && result.value.data).toEqual(empty);
  });
});

describe('the file is checked before it is read', () => {
  it('accepts a .json file of a reasonable size, with or without a type', () => {
    expect(checkImportFile({ name: 'copy.json', size: 1000, type: 'application/json' }).ok).toBe(
      true,
    );
    expect(checkImportFile({ name: 'copy.JSON', size: 1000, type: '' }).ok).toBe(true);
  });

  it.each([
    ['a text file', { name: 'copy.txt', size: 10, type: 'text/plain' }],
    ['a picture', { name: 'photo.png', size: 10, type: 'image/png' }],
    ['a script', { name: 'run.js', size: 10, type: 'text/javascript' }],
    ['.json in the middle of the name', { name: 'copy.json.exe', size: 10, type: '' }],
    ['a .json name with another type', { name: 'copy.json', size: 10, type: 'image/png' }],
  ])('refuses %s as the wrong type', (_name, meta) => {
    const result = checkImportFile(meta);
    expect(!result.ok && result.error.code).toBe('WRONG_TYPE');
  });

  it('refuses a file of 50 MB without reading it', () => {
    const result = checkImportFile({
      name: 'big.json',
      size: 50 * 1024 * 1024,
      type: 'application/json',
    });
    expect(!result.ok && result.error.code).toBe('TOO_LARGE');
  });

  it('the limit is 5 MB: exactly 5 MB passes, one byte more does not', () => {
    expect(IMPORT_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(checkImportFile({ name: 'a.json', size: IMPORT_MAX_BYTES, type: '' }).ok).toBe(true);
    const over = checkImportFile({ name: 'a.json', size: IMPORT_MAX_BYTES + 1, type: '' });
    expect(!over.ok && over.error.code).toBe('TOO_LARGE');
  });

  it('refuses an empty file', () => {
    const result = checkImportFile({ name: 'a.json', size: 0, type: '' });
    expect(!result.ok && result.error.code).toBe('EMPTY');
  });

  it('a text that is longer than the limit is refused even if the size said otherwise', () => {
    expect(codeOf('x'.repeat(IMPORT_MAX_BYTES + 1))).toBe('TOO_LARGE');
  });
});

describe('a bad file changes nothing and says why', () => {
  it.each([
    ['not JSON', '{not json', 'NOT_JSON'],
    ['HTML', '<script>alert(1)</script>', 'NOT_JSON'],
    ['an empty text', '   ', 'EMPTY'],
    ['a list', '[]', 'NOT_SKIN_BARRIER'],
    ['null', 'null', 'NOT_SKIN_BARRIER'],
    ['a number', '42', 'NOT_SKIN_BARRIER'],
    [
      'JSON of another app',
      JSON.stringify({ app: 'other', schemaVersion: 1, data: {} }),
      'NOT_SKIN_BARRIER',
    ],
    ['no app field', JSON.stringify({ schemaVersion: 3, data: {} }), 'NOT_SKIN_BARRIER'],
    ['a newer version', fileOf(state, { schemaVersion: 99 }), 'NEWER_VERSION'],
    [
      'no data',
      JSON.stringify({
        app: 'skin-barrier',
        schemaVersion: 3,
        exportedAt: '2026-01-15T12:30:00.000Z',
      }),
      'INVALID_DATA',
    ],
    ['data that is not an object', fileOf('hello'), 'INVALID_DATA'],
    ['a version that is not a number', fileOf(state, { schemaVersion: '3' }), 'INVALID_DATA'],
    ['a version of 0', fileOf(state, { schemaVersion: 0 }), 'INVALID_DATA'],
    ['a bad export date', fileOf(state, { exportedAt: 'yesterday' }), 'INVALID_DATA'],
    ['a missing slice', fileOf({ ...state, journal: undefined }), 'INVALID_DATA'],
    [
      'a wrong value in the journal',
      fileOf({ ...state, journal: [{ ...state.journal[0], symptoms: { dryness: 7 } }] }),
      'INVALID_DATA',
    ],
    [
      'a note over the limit',
      fileOf({ ...state, journal: [{ ...state.journal[0], note: 'x'.repeat(2001) }] }),
      'INVALID_DATA',
    ],
    [
      'a bad date in the journal',
      fileOf({ ...state, journal: [{ ...state.journal[0], date: '15.01.2026' }] }),
      'INVALID_DATA',
    ],
    [
      'a bad reminder time',
      fileOf({
        ...state,
        settings: {
          ...state.settings,
          reminders: { ...state.settings.reminders, am: { enabled: true, time: '25:99' } },
        },
      }),
      'INVALID_DATA',
    ],
  ])('%s: %s', (_name, text, code) => {
    expect(codeOf(text)).toBe(code);
  });

  it('the error carries only a code, never a piece of the file', () => {
    const result = parseImport(fileOf({ secret: 'do-not-show-me' }), identity);
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_DATA' } });
  });
});

describe('what is in the file is data, never instructions', () => {
  it('fields that the schema does not know are dropped at every level', () => {
    const polluted = {
      ...state,
      evil: { run: 'rm -rf' },
      profile: state.profile && { ...state.profile, evil: 1 },
      journal: state.journal.map((entry) => ({ ...entry, evil: 2 })),
      settings: { ...state.settings, evil: 3 },
    };
    const result = parseImport(fileOf(polluted, { topLevelEvil: true }), identity);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty('topLevelEvil');
    expect(result.value.data).not.toHaveProperty('evil');
    expect(result.value.data.profile).not.toHaveProperty('evil');
    expect(result.value.data.journal[0]).not.toHaveProperty('evil');
    expect(result.value.data.settings).not.toHaveProperty('evil');
    // after dropping the extras the data equals the clean state
    expect(result.value.data).toEqual(state);
  });

  it('a "__proto__" key does not reach any prototype', () => {
    const text = fileOf(state).replace(
      '"app"',
      '"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "app"',
    );
    const result = parseImport(text, identity);
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    if (result.ok) expect(result.value).not.toHaveProperty('polluted');
  });

  it('a <script> in a note stays exactly as written (it is shown as text later)', () => {
    const note = '<script>alert(1)</script>';
    const data = { ...state, journal: [{ ...state.journal[0], note }] };
    const result = parseImport(fileOf(data), identity);
    expect(result.ok && result.value.data.journal[0]?.note).toBe(note);
  });
});

describe('older files', () => {
  it('a file of an older version goes through the migration and is checked after it', () => {
    const seen: number[] = [];
    const options: ParseOptions = {
      currentVersion: 3,
      migrate: (data, from) => {
        seen.push(from);
        return data;
      },
    };
    const result = parseImport(fileOf(state, { schemaVersion: 2 }), options);
    expect(seen).toEqual([2]);
    expect(result.ok && result.value.schemaVersion).toBe(3);
  });

  it('a migration that returns something broken is refused, not applied', () => {
    const options: ParseOptions = { currentVersion: 3, migrate: () => ({ nothing: true }) };
    expect(codeOf(fileOf(state, { schemaVersion: 1 }), options)).toBe('INVALID_DATA');
  });

  it('the current version does not call the migration', () => {
    const seen: number[] = [];
    parseImport(fileOf(state), {
      currentVersion: 3,
      migrate: (data, from) => {
        seen.push(from);
        return data;
      },
    });
    expect(seen).toEqual([]);
  });
});

describe('applying an import', () => {
  const granted = { photoToAi: { granted: true, at: '2026-01-10T10:00:00.000Z' } };
  const notGranted = { photoToAi: { granted: false, at: null } };
  const withConsent = (consents: PersistedState['settings']['consents']): PersistedState => ({
    ...state,
    settings: { ...state.settings, consents },
  });
  const fileWith = (data: PersistedState) => {
    const parsed = parseImport(serializeExport(createExport(data, 3, NOW)), identity);
    if (!parsed.ok) throw new Error('the test file must be valid');
    return parsed.value;
  };

  it('everything comes from the file', () => {
    const current: PersistedState = { ...state, journal: [], products: [], profile: null };
    const applied = applyImport(current, fileWith(state), { replaceConsents: false });
    expect(applied.journal).toEqual(state.journal);
    expect(applied.products).toEqual(state.products);
    expect(applied.profile).toEqual(state.profile);
    expect(applied.settings.reminders).toEqual(state.settings.reminders);
  });

  it('the photo consent is NOT taken from the file unless the user agreed', () => {
    const file = fileWith(withConsent(granted));
    const applied = applyImport(withConsent(notGranted), file, { replaceConsents: false });
    expect(applied.settings.consents).toEqual(notGranted);
  });

  it('a consent that is granted on the device is not withdrawn by the file either', () => {
    const file = fileWith(withConsent(notGranted));
    const applied = applyImport(withConsent(granted), file, { replaceConsents: false });
    expect(applied.settings.consents).toEqual(granted);
  });

  it("with the user's agreement the consent comes from the file", () => {
    const file = fileWith(withConsent(granted));
    const applied = applyImport(withConsent(notGranted), file, { replaceConsents: true });
    expect(applied.settings.consents).toEqual(granted);
  });

  it('the file with the same consent as the device changes nothing about it', () => {
    const file = fileWith(withConsent(notGranted));
    expect(consentsDiffer(withConsent(notGranted), file)).toBe(false);
    expect(consentsDiffer(withConsent(granted), file)).toBe(true);
  });

  it('does not change its arguments', () => {
    const current = withConsent(notGranted);
    const file = fileWith(withConsent(granted));
    const before = JSON.stringify([current, file]);
    applyImport(current, file, { replaceConsents: true });
    expect(JSON.stringify([current, file])).toBe(before);
  });

  it('the summary counts records and never carries their text', () => {
    const summary = summarizeImport(fileWith(withConsent(granted)));
    expect(summary).toEqual({
      exportedAt: '2026-01-15T12:30:00.000Z',
      hasProfile: true,
      journalCount: 1,
      productsCount: 1,
      scansCount: 0,
      fileConsentGranted: true,
    });
  });
});
