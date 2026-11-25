import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from '@/lib/download';
import { parseImport } from '@/lib/exportImport';
import { t } from '@/i18n';
import { dateAfter } from '@/logic/journal';
import { migrate, pickPersisted, STORE_VERSION } from '@/store';
import { APP_NOW, productOf, renderApp } from '@/test/appHarness';
import { createMemoryPhotoStore } from '@/test/fakes';
import { PERSONAS } from '@/test/personas';
import type { JournalEntry, PersistedState } from '@/types';

vi.mock('@/lib/download', () => ({ downloadTextFile: vi.fn() }));

beforeEach(() => {
  vi.mocked(downloadTextFile).mockClear();
});
afterEach(cleanup);

const ago = (days: number) => dateAfter(APP_NOW, -days);
const journalEntry = (
  id: string,
  date: string,
  note: string,
  patch: Partial<JournalEntry> = {},
): JournalEntry => ({
  id,
  date,
  symptoms: { dryness: 2 },
  newProductIds: [],
  note,
  ...patch,
});

const PRODUCT = productOf('p-1', 'Calm cream', 'Aqua, Glycerin, Panthenol, Allantoin, Squalane', {
  category: 'moisturizer',
});

const open = (path: string, options: Parameters<typeof renderApp>[1] = {}) =>
  renderApp(path, { persona: PERSONAS.T2, now: APP_NOW, ...options });

/** What the last "download" got: the file name and the text. */
function lastDownload(): { name: string; text: string; mime: string | undefined } {
  const call = vi.mocked(downloadTextFile).mock.calls.at(-1);
  if (!call) throw new Error('nothing was downloaded');
  return { name: call[0], text: call[1], mime: call[2] };
}

function jsonFile(text: string, name = 'copy.json', type = 'application/json'): File {
  return new File([text], name, { type });
}

function choose(file: File) {
  const input = screen.getByLabelText(t('settings.importChoose'));
  fireEvent.change(input, { target: { files: [file] } });
}

/** A valid export file of the given state, as the app itself writes it. */
function exportText(): string {
  fireEvent.click(screen.getByRole('button', { name: t('settings.exportButton') }));
  return lastDownload().text;
}

describe('the settings start', () => {
  it('has the title, three links and a way back', async () => {
    open('/profile/settings');
    expect(await screen.findByRole('heading', { name: t('settings.title') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('settings.remindersLink') })).toHaveAttribute(
      'href',
      '/profile/settings/reminders',
    );
    expect(screen.getByRole('link', { name: t('settings.consentsLink') })).toHaveAttribute(
      'href',
      '/profile/settings/consents',
    );
    expect(screen.getByRole('link', { name: t('settings.dataLink') })).toHaveAttribute(
      'href',
      '/profile/settings/data',
    );
    expect(screen.getByRole('link', { name: t('settings.toProfile') })).toHaveAttribute(
      'href',
      '/profile',
    );
  });

  it('the two journal switches are off by default and are saved when changed', async () => {
    const { store } = open('/profile/settings');
    const cycle = await screen.findByRole('checkbox', { name: t('settings.cycleToggle') });
    const shaving = screen.getByRole('checkbox', { name: t('settings.shavingToggle') });
    expect(cycle).not.toBeChecked();
    expect(shaving).not.toBeChecked();

    fireEvent.click(cycle);
    fireEvent.click(shaving);
    expect(store.getState().settings.cycleTrackingVisible).toBe(true);
    expect(store.getState().settings.showShavingField).toBe(true);
    fireEvent.click(cycle);
    expect(store.getState().settings.cycleTrackingVisible).toBe(false);
  });
});

describe('reminders: only the interface and what is saved', () => {
  it('says that real notifications come later, and has no guilt', async () => {
    open('/profile/settings/reminders');
    expect(
      await screen.findByRole('heading', { name: t('settings.remindersTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('settings.remindersLater'))).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/серія|стрік|не забудь|ти забула|втрачен/i);
  });

  it('three switches, all off at first, with no time fields', async () => {
    const { store } = open('/profile/settings/reminders');
    await screen.findByRole('heading', { name: t('settings.remindersTitle') });
    for (const key of [
      'settings.reminderAm',
      'settings.reminderPm',
      'settings.reminderJournal',
    ] as const) {
      expect(screen.getByRole('checkbox', { name: t(key) })).not.toBeChecked();
    }
    expect(document.querySelectorAll('input[type="time"]')).toHaveLength(0);
    expect(store.getState().settings.reminders.am).toEqual({ enabled: false, time: null });
  });

  it('switching one on gives it a time that can be changed; both are saved', async () => {
    const { store } = open('/profile/settings/reminders');
    fireEvent.click(await screen.findByRole('checkbox', { name: t('settings.reminderAm') }));
    expect(store.getState().settings.reminders.am).toEqual({ enabled: true, time: '08:00' });

    const time = screen.getByLabelText(
      t('settings.reminderTime', { name: t('settings.reminderAm') }),
    );
    expect(time).toHaveValue('08:00');
    fireEvent.change(time, { target: { value: '07:15' } });
    expect(store.getState().settings.reminders.am).toEqual({ enabled: true, time: '07:15' });
    // the others are untouched
    expect(store.getState().settings.reminders.pm).toEqual({ enabled: false, time: null });
  });

  it('switching off keeps the chosen time for next time and hides the field', async () => {
    const { store } = open('/profile/settings/reminders', {
      settings: {
        reminders: {
          am: { enabled: true, time: '06:45' },
          pm: { enabled: false, time: null },
          journal: { enabled: false, time: null },
        },
      },
    });
    fireEvent.click(await screen.findByRole('checkbox', { name: t('settings.reminderAm') }));
    expect(store.getState().settings.reminders.am).toEqual({ enabled: false, time: '06:45' });
    expect(document.querySelectorAll('input[type="time"]')).toHaveLength(0);
  });

  it('a time that is not a time is not saved as one', async () => {
    const { store } = open('/profile/settings/reminders');
    fireEvent.click(await screen.findByRole('checkbox', { name: t('settings.reminderPm') }));
    fireEvent.change(
      screen.getByLabelText(t('settings.reminderTime', { name: t('settings.reminderPm') })),
      {
        target: { value: '' },
      },
    );
    expect(store.getState().settings.reminders.pm.time).toBeNull();
  });
});

describe('consents', () => {
  it('nothing is allowed by default and the screen says when it will be asked', async () => {
    open('/profile/settings/consents');
    expect(
      await screen.findByRole('heading', { name: t('settings.consentsTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('settings.photoNotGranted'))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t('settings.photoRevoke') }),
    ).not.toBeInTheDocument();
  });

  it('a granted consent is shown with its date and can be taken back', async () => {
    const { store } = open('/profile/settings/consents', {
      settings: { consents: { photoToAi: { granted: true, at: '2026-01-02T10:00:00.000Z' } } },
    });
    expect(
      await screen.findByText(t('settings.photoGranted', { date: '02.01.2026' })),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('settings.photoRevoke') }));
    expect(store.getState().settings.consents.photoToAi).toEqual({ granted: false, at: null });
    expect(screen.getByText(t('settings.photoNotGranted'))).toBeInTheDocument();
  });
});

describe('what is stored', () => {
  it('explains in plain words and counts each kind', async () => {
    open('/profile/settings/data', {
      products: [PRODUCT],
      journal: [journalEntry('a', ago(1), 'one'), journalEntry('b', ago(2), 'two')],
    });
    expect(
      await screen.findByRole('heading', { name: t('settings.storedTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('settings.storedIntro'))).toBeInTheDocument();
    expect(
      screen.getByText(t('settings.storedProfile', { state: t('settings.storedProfileYes') })),
    ).toBeInTheDocument();
    expect(screen.getByText(t('settings.storedProducts', { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(t('settings.storedScans', { count: 0 }))).toBeInTheDocument();
    expect(screen.getByText(t('settings.storedJournal', { count: 2 }))).toBeInTheDocument();
  });

  it('warns that clearing the browser data destroys everything without a copy', async () => {
    open('/profile/settings/data');
    expect(await screen.findByText(t('settings.browserWarning'))).toBeInTheDocument();
  });

  it('the numbers follow the changes', async () => {
    const { store } = open('/profile/settings/data');
    await screen.findByText(t('settings.storedJournal', { count: 0 }));
    store.getState().actions.journal.add(journalEntry('a', ago(1), 'x'));
    expect(await screen.findByText(t('settings.storedJournal', { count: 1 }))).toBeInTheDocument();
  });
});

describe('export', () => {
  it('downloads one JSON file with the date in the name and the whole state inside', async () => {
    const { store } = open('/profile/settings/data', {
      products: [PRODUCT],
      journal: [journalEntry('a', ago(1), 'note one')],
    });
    fireEvent.click(await screen.findByRole('button', { name: t('settings.exportButton') }));

    const { name, text, mime } = lastDownload();
    expect(name).toBe('skin-barrier-2026-01-05.json');
    expect(mime).toBe('application/json');
    expect(screen.getByText(t('settings.exportDone', { name }))).toBeInTheDocument();

    const parsed = parseImport(text, { currentVersion: STORE_VERSION, migrate });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.app).toBe('skin-barrier');
      expect(parsed.value.schemaVersion).toBe(STORE_VERSION);
      expect(parsed.value.data).toEqual(pickPersisted(store.getState()));
    }
  });

  it('says that the file holds personal data', async () => {
    open('/profile/settings/data');
    expect(await screen.findByText(t('settings.exportText'))).toBeInTheDocument();
  });
});

describe('import: a good file', () => {
  it('first shows what is in the file; nothing changes until "Replace"', async () => {
    open('/profile/settings/data', {
      products: [PRODUCT],
      journal: [journalEntry('a', ago(1), 'kept'), journalEntry('b', ago(2), 'kept too')],
    });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();

    // another device: nothing there yet
    const { store } = open('/profile/settings/data', { persona: null });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));

    expect(await screen.findByText(t('settings.importPreviewTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('settings.importJournal', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText(t('settings.importProducts', { count: 1 }))).toBeInTheDocument();
    expect(
      screen.getByText(t('settings.importCreated', { date: '05.01.2026' })),
    ).toBeInTheDocument();
    expect(store.getState().journal).toEqual([]);
    expect(store.getState().profile).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: t('settings.importConfirm') }));
    expect(store.getState().journal.map((item) => item.note)).toEqual(['kept', 'kept too']);
    expect(store.getState().products.map((item) => item.id)).toEqual(['p-1']);
    expect(store.getState().profile).not.toBeNull();
    expect(screen.getByText(t('settings.importDone'))).toBeInTheDocument();
  });

  it('"Cancel" leaves the data as it was', async () => {
    open('/profile/settings/data', { journal: [journalEntry('a', ago(1), 'in file')] });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();

    const { store } = open('/profile/settings/data', {
      journal: [journalEntry('z', ago(3), 'mine')],
    });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));
    fireEvent.click(await screen.findByRole('button', { name: t('settings.importCancel') }));
    expect(store.getState().journal.map((item) => item.note)).toEqual(['mine']);
    expect(screen.queryByText(t('settings.importPreviewTitle'))).not.toBeInTheDocument();
  });

  it('a <script> in a note of the file is shown as text in the journal', async () => {
    open('/profile/settings/data', {
      journal: [journalEntry('a', ago(1), '<script>alert(1)</script>')],
    });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();

    const { store, router } = open('/profile/settings/data', { persona: null });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));
    fireEvent.click(await screen.findByRole('button', { name: t('settings.importConfirm') }));
    await router.navigate('/profile/journal');
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(store.getState().journal[0]?.note).toBe('<script>alert(1)</script>');
  });
});

describe('import: the photo consent is never changed silently', () => {
  const granted = { photoToAi: { granted: true, at: '2026-01-02T10:00:00.000Z' } };

  async function fileWithConsent(): Promise<string> {
    open('/profile/settings/data', { settings: { consents: granted } });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();
    return text;
  }

  it('the file says "granted", the device says "no": it asks, and without a tick keeps "no"', async () => {
    const text = await fileWithConsent();
    const { store } = open('/profile/settings/data');
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));

    const tick = await screen.findByRole('checkbox', { name: t('settings.importConsentCheck') });
    expect(tick).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: t('settings.importConfirm') }));
    expect(store.getState().settings.consents.photoToAi.granted).toBe(false);
  });

  it('with the tick the consent comes from the file', async () => {
    const text = await fileWithConsent();
    const { store } = open('/profile/settings/data');
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));
    fireEvent.click(
      await screen.findByRole('checkbox', { name: t('settings.importConsentCheck') }),
    );
    fireEvent.click(screen.getByRole('button', { name: t('settings.importConfirm') }));
    expect(store.getState().settings.consents.photoToAi).toEqual(granted.photoToAi);
  });

  it('a granted consent on the device is not taken back by a file without it', async () => {
    open('/profile/settings/data');
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();

    const { store } = open('/profile/settings/data', { settings: { consents: granted } });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));
    // the file differs, so the question comes; the answer "no tick" keeps the device as it is
    await screen.findByRole('checkbox', { name: t('settings.importConsentCheck') });
    fireEvent.click(screen.getByRole('button', { name: t('settings.importConfirm') }));
    expect(store.getState().settings.consents.photoToAi.granted).toBe(true);
  });

  it('when both agree the question is not asked at all', async () => {
    open('/profile/settings/data');
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();
    open('/profile/settings/data');
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile(text));
    await screen.findByText(t('settings.importPreviewTitle'));
    expect(
      screen.queryByRole('checkbox', { name: t('settings.importConsentCheck') }),
    ).not.toBeInTheDocument();
  });
});

describe('import: a bad file changes nothing and says so', () => {
  async function tryFile(file: File, options: Parameters<typeof renderApp>[1] = {}) {
    const result = open('/profile/settings/data', {
      products: [PRODUCT],
      journal: [journalEntry('a', ago(1), 'mine')],
      ...options,
    });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const before = JSON.stringify(pickPersisted(result.store.getState()));
    choose(file);
    return { ...result, before };
  }

  const expectRefused = async (
    code:
      | 'WRONG_TYPE'
      | 'TOO_LARGE'
      | 'EMPTY'
      | 'NOT_JSON'
      | 'NOT_SKIN_BARRIER'
      | 'NEWER_VERSION'
      | 'INVALID_DATA',
    file: File,
  ) => {
    const { store, before } = await tryFile(file);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(t(`settings.importError.${code}`))).toBeInTheDocument();
    expect(within(alert).getByText(t('settings.importErrorNote'))).toBeInTheDocument();
    expect(JSON.stringify(pickPersisted(store.getState()))).toBe(before);
    expect(screen.queryByText(t('settings.importPreviewTitle'))).not.toBeInTheDocument();
  };

  it('a .txt file', () => expectRefused('WRONG_TYPE', jsonFile('{}', 'copy.txt', 'text/plain')));
  it('a picture', () => expectRefused('WRONG_TYPE', jsonFile('png', 'photo.png', 'image/png')));

  it('a file of 50 MB: refused by its size, before it is read', async () => {
    const huge = jsonFile('{}');
    Object.defineProperty(huge, 'size', { value: 50 * 1024 * 1024 });
    await expectRefused('TOO_LARGE', huge);
  });

  it('an empty file', () => expectRefused('EMPTY', jsonFile('')));
  it('not JSON at all', () => expectRefused('NOT_JSON', jsonFile('this is not json')));
  it('HTML with a script renamed to .json', () =>
    expectRefused('NOT_JSON', jsonFile('<script>alert(1)</script>')));
  it('JSON of another app', () =>
    expectRefused('NOT_SKIN_BARRIER', jsonFile('{"app":"other","data":{}}')));
  it('a list', () => expectRefused('NOT_SKIN_BARRIER', jsonFile('[1,2,3]')));
  it('a newer version of the app', () =>
    expectRefused(
      'NEWER_VERSION',
      jsonFile(
        JSON.stringify({
          app: 'skin-barrier',
          schemaVersion: STORE_VERSION + 5,
          exportedAt: '2026-01-05T12:00:00.000Z',
          data: {},
        }),
      ),
    ));
  it('the right envelope but broken data', () =>
    expectRefused(
      'INVALID_DATA',
      jsonFile(
        JSON.stringify({
          app: 'skin-barrier',
          schemaVersion: STORE_VERSION,
          exportedAt: '2026-01-05T12:00:00.000Z',
          data: { journal: 'nope' },
        }),
      ),
    ));

  it('the error shows no piece of the file', async () => {
    const secret = 'do-not-show-me';
    await tryFile(
      jsonFile(
        JSON.stringify({
          app: 'skin-barrier',
          schemaVersion: STORE_VERSION,
          exportedAt: 'x',
          data: secret,
        }),
      ),
    );
    await screen.findByRole('alert');
    expect(document.body.textContent ?? '').not.toContain(secret);
  });

  it('after an error a good file can still be chosen', async () => {
    open('/profile/settings/data', { journal: [journalEntry('a', ago(1), 'in file')] });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    cleanup();

    open('/profile/settings/data');
    await screen.findByRole('button', { name: t('settings.exportButton') });
    choose(jsonFile('nope'));
    await screen.findByRole('alert');
    choose(jsonFile(text));
    expect(await screen.findByText(t('settings.importPreviewTitle'))).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('deleting', () => {
  const full = () => ({
    products: [PRODUCT],
    journal: [
      journalEntry('a', ago(1), 'note', { cyclePeriod: 'pre_menstrual', newProductIds: ['p-1'] }),
    ],
  });
  const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

  it('asks before deleting one kind; "Cancel" changes nothing', async () => {
    const { store } = open('/profile/settings/data', full());
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    press(t('settings.categoryButton', { name: t('settings.category.journal') }));
    expect(
      screen.getByRole('dialog', {
        name: t('settings.categoryTitle', { name: t('settings.category.journal') }),
      }),
    ).toBeInTheDocument();
    press(t('settings.deleteCancel'));
    expect(store.getState().journal).toHaveLength(1);
  });

  it('the journal: only the entries go', async () => {
    const { store } = open('/profile/settings/data', full());
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    press(t('settings.categoryButton', { name: t('settings.category.journal') }));
    press(t('settings.deleteConfirm'));
    expect(store.getState().journal).toEqual([]);
    expect(store.getState().products).toHaveLength(1);
    expect(store.getState().profile).not.toBeNull();
    expect(screen.getByText(t('settings.deleteDone'))).toBeInTheDocument();
    expect(screen.getByText(t('settings.storedJournal', { count: 0 }))).toBeInTheDocument();
  });

  it('the history of checks', async () => {
    const { store } = open('/profile/settings/data', full());
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    press(t('settings.categoryButton', { name: t('settings.category.scans') }));
    press(t('settings.deleteConfirm'));
    expect(store.getState().scans).toEqual([]);
    expect(store.getState().journal).toHaveLength(1);
  });

  it('the collection: products go, the entry stays without the mark of the product', async () => {
    const { store } = open('/profile/settings/data', full());
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    press(t('settings.categoryButton', { name: t('settings.category.collection') }));
    press(t('settings.deleteConfirm'));
    expect(store.getState().products).toEqual([]);
    expect(store.getState().journal[0]?.newProductIds).toEqual([]);
    expect(store.getState().journal[0]?.note).toBe('note');
  });

  it('the cycle: gone from the profile, the answers and the old entries; the other data stays', async () => {
    const { store } = open('/profile/settings/data', {
      ...full(),
      settings: { cycleTrackingVisible: true },
    });
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    expect(store.getState().profile?.cycle.status).toBe('noticed');
    press(t('settings.categoryButton', { name: t('settings.category.cycle') }));
    press(t('settings.deleteConfirm'));

    const state = store.getState();
    expect(state.profile?.cycle).toEqual({ status: null, phases: [], effects: [] });
    expect(state.profile?.revision).toBe(2);
    expect(state.journal[0]).not.toHaveProperty('cyclePeriod');
    expect(state.journal[0]?.note).toBe('note');
    expect(state.settings.cycleTrackingVisible).toBe(false);
    expect(state.products).toHaveLength(1);
  });

  it('"Delete all" asks, warns, and then empties everything but the welcome screens', async () => {
    const { store } = open('/profile/settings/data', full());
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    press(t('settings.deleteAllButton'));
    const dialog = screen.getByRole('dialog', { name: t('settings.deleteAllTitle') });
    expect(within(dialog).getByText(t('settings.deleteAllText'))).toBeInTheDocument();
    press(t('settings.deleteAllConfirm'));

    const state = store.getState();
    expect(state.profile).toBeNull();
    expect(state.products).toEqual([]);
    expect(state.journal).toEqual([]);
    expect(state.routine).toEqual([]);
    expect(state.settings.cycleTrackingVisible).toBe(false);
    // the app stays open (no new welcome screens), so a copy can be restored right here
    expect(state.onboarding.completed).toBe(true);
    expect(screen.getByRole('heading', { name: t('settings.dataTitle') })).toBeInTheDocument();
  });
});

describe('the whole way: export, "Delete all", import: everything is back and identical', () => {
  it('restores the same state', async () => {
    const entries = [
      journalEntry('a', ago(1), 'first note', { feeling: 'so_so', cyclePeriod: 'pre_menstrual' }),
      journalEntry('b', ago(2), 'second', { symptoms: { breakouts: 3 }, newProductIds: ['p-1'] }),
    ];
    const { store } = open('/profile/settings/data', { products: [PRODUCT], journal: entries });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const original: PersistedState = pickPersisted(store.getState());
    const text = exportText();

    fireEvent.click(screen.getByRole('button', { name: t('settings.deleteAllButton') }));
    fireEvent.click(screen.getByRole('button', { name: t('settings.deleteAllConfirm') }));
    expect(store.getState().journal).toEqual([]);
    expect(store.getState().profile).toBeNull();

    choose(jsonFile(text));
    fireEvent.click(await screen.findByRole('button', { name: t('settings.importConfirm') }));

    await waitFor(() => expect(store.getState().journal).toHaveLength(2));
    expect(pickPersisted(store.getState())).toEqual(original);
  });
});

describe('photos on the device follow the data', () => {
  const blob = () => new Blob(['x'], { type: 'image/jpeg' });
  const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

  async function withPhotos(ids: string[], options: Parameters<typeof renderApp>[1] = {}) {
    const photos = createMemoryPhotoStore();
    for (const id of ids) await photos.put(id, blob());
    const view = open('/profile/settings/data', { ...options, services: { photos } });
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    return { ...view, photos };
  }
  const keysOf = async (photos: ReturnType<typeof createMemoryPhotoStore>) => {
    const result = await photos.keys();
    return result.ok ? [...result.value].sort() : null;
  };

  it('"What is stored" counts the photos, and the export says they are not in the file', async () => {
    await withPhotos(['p-1', 'other']);
    expect(await screen.findByText(t('settings.storedPhotos', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText(t('settings.exportPhotosNote'))).toBeInTheDocument();
  });

  it('"Delete all" removes every photo', async () => {
    const { photos } = await withPhotos(['p-1', 'other'], { products: [PRODUCT] });
    press(t('settings.deleteAllButton'));
    press(t('settings.deleteAllConfirm'));
    await waitFor(async () => expect(await keysOf(photos)).toEqual([]));
  });

  it('deleting the collection removes the photos of its products and keeps those of checked ones', async () => {
    const scan = {
      id: 'scan-1',
      productSnapshot: { id: 'checked-only' },
    } as unknown as PersistedState['scans'][number];
    const { photos } = await withPhotos(['p-1', 'checked-only'], {
      products: [PRODUCT],
      scans: [scan],
    });
    press(t('settings.categoryButton', { name: t('settings.category.collection') }));
    press(t('settings.deleteConfirm'));
    await waitFor(async () => expect(await keysOf(photos)).toEqual(['checked-only']));
  });

  it('deleting the history keeps the photos of products in the collection', async () => {
    const scan = {
      id: 'scan-1',
      productSnapshot: { id: 'checked-only' },
    } as unknown as PersistedState['scans'][number];
    const { photos } = await withPhotos(['p-1', 'checked-only'], {
      products: [PRODUCT],
      scans: [scan],
    });
    press(t('settings.categoryButton', { name: t('settings.category.scans') }));
    press(t('settings.deleteConfirm'));
    await waitFor(async () => expect(await keysOf(photos)).toEqual(['p-1']));
  });

  it('deleting the journal does not touch photos', async () => {
    const { photos } = await withPhotos(['p-1', 'whatever'], {
      journal: [journalEntry('a', ago(1), 'note')],
    });
    press(t('settings.categoryButton', { name: t('settings.category.journal') }));
    press(t('settings.deleteConfirm'));
    await waitFor(() => expect(screen.getByText(t('settings.deleteDone'))).toBeInTheDocument());
    expect(await keysOf(photos)).toEqual(['p-1', 'whatever']);
  });

  it('after an import the photos of products that are not in the data are removed', async () => {
    const source = open('/profile/settings/data', { products: [PRODUCT] });
    await screen.findByRole('button', { name: t('settings.exportButton') });
    const text = exportText();
    source.store.getState().actions.resetAll();
    cleanup();

    const { photos } = await withPhotos(['p-1', 'gone']);
    choose(jsonFile(text));
    fireEvent.click(await screen.findByRole('button', { name: t('settings.importConfirm') }));
    await waitFor(async () => expect(await keysOf(photos)).toEqual(['p-1']));
  });

  it('a photo that cannot be deleted is reported, not hidden', async () => {
    const photos = createMemoryPhotoStore();
    const broken = {
      ...photos,
      clear: () => Promise.resolve({ ok: false as const, error: { code: 'unknown' as const } }),
    };
    open('/profile/settings/data', { services: { photos: broken } });
    await screen.findByRole('heading', { name: t('settings.deletePartTitle') });
    press(t('settings.deleteAllButton'));
    press(t('settings.deleteAllConfirm'));
    expect(await screen.findByText(t('settings.photosNotDeleted'))).toBeInTheDocument();
  });
});
