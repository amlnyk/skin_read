import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { dateAfter } from '@/logic/journal';
import { APP_NOW, productOf, renderApp } from '@/test/appHarness';
import { createMemoryAdapter, createTestStore } from '@/test/fakes';
import { PERSONAS } from '@/test/personas';
import type { Intensity, JournalEntry, SkinProfile } from '@/types';
import { formatDate, localDate } from './today';

afterEach(cleanup);

const TODAY = localDate(APP_NOW);
const ago = (days: number) => dateAfter(APP_NOW, -days);

function entry(
  id: string,
  date: string,
  symptoms: JournalEntry['symptoms'] = {},
  note = '',
): JournalEntry {
  return { id, date, symptoms, newProductIds: [], note };
}

/** `count` entries with the symptom at the given level, one on each of the given days ago. */
function marked(
  symptom: keyof JournalEntry['symptoms'],
  level: Intensity,
  days: number[],
): JournalEntry[] {
  return days.map((day, index) => entry(`e-${symptom}-${index}`, ago(day), { [symptom]: level }));
}

const open = (journal: JournalEntry[] = [], extra: Parameters<typeof renderApp>[1] = {}) =>
  renderApp('/profile/journal', { persona: PERSONAS.T4, journal, now: APP_NOW, ...extra });

const pick = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const clickAdd = async () =>
  fireEvent.click(await screen.findByRole('button', { name: t('journal.add') }));

describe('the journal screen', () => {
  it('has the title, a short intro and an invitation, not a duty', async () => {
    open();
    expect(await screen.findByRole('heading', { name: t('journal.title') })).toBeInTheDocument();
    expect(screen.getByText(t('journal.intro'))).toBeInTheDocument();
    expect(screen.getByText(t('journal.listEmpty'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('journal.back') })).toHaveAttribute(
      'href',
      '/profile',
    );
  });

  it('never talks about missed days or streaks', async () => {
    open([entry('old', ago(40), { dryness: 1 })]);
    await screen.findByRole('heading', { name: t('journal.title') });
    expect(document.body.textContent ?? '').not.toMatch(
      /пропущ|серія|стрік|не заповнював|нагадуємо/i,
    );
  });

  it('the profile screen links to the journal and to the settings', async () => {
    renderApp('/profile', { persona: PERSONAS.T4 });
    expect(await screen.findByRole('link', { name: t('profile.journalLink') })).toHaveAttribute(
      'href',
      '/profile/journal',
    );
    expect(screen.getByRole('link', { name: t('profile.settingsLink') })).toHaveAttribute(
      'href',
      '/profile/settings',
    );
  });
});

describe('creating an entry', () => {
  it('the date is today and cannot be in the future', async () => {
    open();
    await clickAdd();
    const date = screen.getByLabelText(t('journal.date'));
    expect(date).toHaveValue(TODAY);
    expect(date).toHaveAttribute('max', TODAY);
  });

  it('nothing is filled: "Save" is off and says what to do', async () => {
    open();
    await clickAdd();
    expect(screen.getByRole('button', { name: t('journal.save') })).toBeDisabled();
    expect(screen.getByText(t('journal.emptyForm'))).toBeInTheDocument();
    // changing the date alone is not a record
    fireEvent.change(screen.getByLabelText(t('journal.date')), { target: { value: ago(2) } });
    expect(screen.getByRole('button', { name: t('journal.save') })).toBeDisabled();
  });

  it('one filled field is enough: only a note', async () => {
    const { store } = open();
    await clickAdd();
    fireEvent.change(screen.getByLabelText(t('journal.note')), {
      target: { value: 'Today is calm' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));

    const saved = store.getState().journal;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({
      id: 'id-1',
      date: TODAY,
      symptoms: {},
      newProductIds: [],
      note: 'Today is calm',
    });
    // the form closes, the entry is in the history
    expect(screen.queryByRole('heading', { name: t('journal.formTitle') })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: formatDate(TODAY) })).toBeInTheDocument();
    expect(screen.getByText('Today is calm')).toBeInTheDocument();
  });

  it('one filled field is enough: only one symptom, "none" (0) counts too', async () => {
    const { store } = open();
    await clickAdd();
    pick(t('journal.symptom.redness'), '0');
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));
    expect(store.getState().journal[0]?.symptoms).toEqual({ redness: 0 });
  });

  it('the feeling, symptoms (0-3) and a past date are saved as chosen', async () => {
    const { store } = open();
    await clickAdd();
    fireEvent.change(screen.getByLabelText(t('journal.date')), { target: { value: ago(3) } });
    pick(t('journal.feeling'), 'so_so');
    pick(t('journal.symptom.dryness'), '2');
    pick(t('journal.symptom.burning'), '3');
    pick(t('journal.symptom.flaking'), '1');
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));

    expect(store.getState().journal[0]).toMatchObject({
      date: ago(3),
      feeling: 'so_so',
      symptoms: { dryness: 2, burning: 3, flaking: 1 },
    });
    const card = (await screen.findByRole('heading', { name: formatDate(ago(3)) })).closest('li');
    expect(card).not.toBeNull();
    const lines = within(card as HTMLElement);
    expect(
      lines.getByText(t('journal.entryFeeling', { value: t('journal.feelingOption.so_so') })),
    ).toBeInTheDocument();
    expect(
      lines.getByText(`${t('journal.symptom.dryness')}: ${t('journal.intensity.2')}`),
    ).toBeInTheDocument();
    expect(
      lines.getByText(`${t('journal.symptom.burning')}: ${t('journal.intensity.3')}`),
    ).toBeInTheDocument();
  });

  it('a field that was set can be set back to "not specified"', async () => {
    const { store } = open();
    await clickAdd();
    pick(t('journal.symptom.dryness'), '2');
    pick(t('journal.symptom.dryness'), '');
    expect(screen.getByRole('button', { name: t('journal.save') })).toBeDisabled();
    pick(t('journal.symptom.redness'), '1');
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));
    expect(store.getState().journal[0]?.symptoms).toEqual({ redness: 1 });
  });

  it('"Cancel" closes the form and saves nothing', async () => {
    const { store } = open();
    await clickAdd();
    fireEvent.change(screen.getByLabelText(t('journal.note')), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: t('journal.cancel') }));
    expect(store.getState().journal).toEqual([]);
    expect(screen.queryByLabelText(t('journal.note'))).not.toBeInTheDocument();
  });

  it('new products are chosen from the collection', async () => {
    const serum = productOf(
      'p-serum',
      'My serum',
      'Aqua, Glycerin, Panthenol, Allantoin, Squalane',
    );
    const { store } = open([], { products: [serum] });
    await clickAdd();
    fireEvent.click(screen.getByRole('checkbox', { name: 'My serum' }));
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));
    expect(store.getState().journal[0]?.newProductIds).toEqual(['p-serum']);
    expect(
      await screen.findByText(t('journal.entryNewProducts', { names: 'My serum' })),
    ).toBeInTheDocument();
  });

  it('without products there is no list of products to choose from', async () => {
    open();
    await clickAdd();
    expect(screen.queryByText(t('journal.newProducts'))).not.toBeInTheDocument();
  });

  it('a long note says where the limit is', async () => {
    open();
    await clickAdd();
    const field = screen.getByLabelText(t('journal.note'));
    expect(field).toHaveAttribute('maxlength', '2000');
    fireEvent.change(field, { target: { value: 'x'.repeat(2000) } });
    expect(screen.getByText(t('journal.noteLimit', { max: 2000 }))).toBeInTheDocument();
  });
});

describe('the optional fields follow the profile and the settings', () => {
  it('T4 (declined to talk about the cycle): no cycle field, no shaving field', async () => {
    open();
    await clickAdd();
    expect(screen.queryByLabelText(t('journal.cyclePeriod'))).not.toBeInTheDocument();
    expect(screen.queryByLabelText(t('journal.shaving'))).not.toBeInTheDocument();
  });

  it('T1 (the cycle is not relevant): no cycle field either', async () => {
    renderApp('/profile/journal', { persona: PERSONAS.T1, now: APP_NOW });
    await clickAdd();
    expect(screen.queryByLabelText(t('journal.cyclePeriod'))).not.toBeInTheDocument();
  });

  it('T2 (notices the cycle effect): the cycle field is there, with the five options', async () => {
    renderApp('/profile/journal', { persona: PERSONAS.T2, now: APP_NOW });
    await clickAdd();
    const field = screen.getByLabelText(t('journal.cyclePeriod'));
    const options = within(field)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual([
      t('journal.notSpecified'),
      t('journal.cycleOption.pre_menstrual'),
      t('journal.cycleOption.during_menstrual'),
      t('journal.cycleOption.post_menstrual'),
      t('journal.cycleOption.other_phase'),
      t('journal.cycleOption.unknown'),
    ]);
  });

  it('the setting shows the cycle field for T4 as well', async () => {
    open([], { settings: { cycleTrackingVisible: true } });
    await clickAdd();
    expect(screen.getByLabelText(t('journal.cyclePeriod'))).toBeInTheDocument();
  });

  it('the shaving field appears only when the setting is on', async () => {
    open([], { settings: { showShavingField: true } });
    await clickAdd();
    expect(screen.getByLabelText(t('journal.shaving'))).toBeInTheDocument();
  });

  it('breakouts before the period are saved as they are, with no conclusion about the cause', async () => {
    const { store } = renderApp('/profile/journal', { persona: PERSONAS.T2, now: APP_NOW });
    await clickAdd();
    pick(t('journal.symptom.breakouts'), '3');
    pick(t('journal.cyclePeriod'), 'pre_menstrual');
    fireEvent.click(screen.getByRole('button', { name: t('journal.save') }));
    expect(store.getState().journal[0]).toMatchObject({
      symptoms: { breakouts: 3 },
      cyclePeriod: 'pre_menstrual',
    });
    expect(
      await screen.findByText(
        t('journal.entryCycle', { value: t('journal.cycleOption.pre_menstrual') }),
      ),
    ).toBeInTheDocument();
    // nothing in the screen explains or predicts: no banner (one entry) and no "because"
    expect(screen.queryByText(t('journal.bannerHint'))).not.toBeInTheDocument();
    // the caption under the chart ("a coincidence in time is not a cause") is the plan's own words
    const text = (document.body.textContent ?? '').replace(t('journal.trendCaption'), '');
    expect(text).not.toMatch(/через|причин|тому що|прогноз/i);
  });
});

describe('the history', () => {
  it('shows the entries, newest first', async () => {
    open([entry('a', ago(5), {}, 'older'), entry('b', ago(1), {}, 'newer')]);
    await screen.findByRole('heading', { name: t('journal.listTitle') });
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([formatDate(ago(1)), formatDate(ago(5))]);
  });

  it('5 entries are kept when the app is opened again', () => {
    const adapter = createMemoryAdapter();
    const first = createTestStore(adapter);
    for (let index = 0; index < 5; index += 1) {
      first
        .getState()
        .actions.journal.add(entry(`e${index}`, ago(index), { dryness: 1 }, `note ${index}`));
    }
    const reopened = createTestStore(adapter);
    expect(reopened.getState().journal).toHaveLength(5);
    expect(reopened.getState().journal.map((item) => item.note)).toEqual(
      [0, 1, 2, 3, 4].map((n) => `note ${n}`),
    );
  });

  it('deleting asks first; "Cancel" keeps the entry', async () => {
    const { store } = open([entry('a', ago(1), {}, 'keep me')]);
    fireEvent.click(
      await screen.findByRole('button', {
        name: t('journal.entryDelete', { date: formatDate(ago(1)) }),
      }),
    );
    expect(screen.getByRole('dialog', { name: t('journal.deleteTitle') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('journal.deleteCancel') }));
    expect(store.getState().journal).toHaveLength(1);
    expect(screen.getByText('keep me')).toBeInTheDocument();
  });

  it('deleting removes only that entry', async () => {
    const { store } = open([entry('a', ago(1), {}, 'first'), entry('b', ago(2), {}, 'second')]);
    fireEvent.click(
      await screen.findByRole('button', {
        name: t('journal.entryDelete', { date: formatDate(ago(1)) }),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: t('journal.deleteConfirm') }));
    expect(store.getState().journal.map((item) => item.id)).toEqual(['b']);
    expect(screen.queryByText('first')).not.toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('a removed product is simply not named any more', async () => {
    open([{ ...entry('a', ago(1), {}, 'x'), newProductIds: ['gone'] }]);
    await screen.findByText('x');
    expect(screen.queryByText(/gone/)).not.toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toContain(
      t('journal.entryNewProducts', { names: '' }),
    );
  });
});

describe('texts are shown as text and nothing is run', () => {
  it('a note with <script> and an <img onerror> stays text', async () => {
    const notes = '<script>alert(1)</script> <img src=x onerror=alert(1)>';
    open([entry('a', ago(1), {}, notes)]);
    expect(await screen.findByText(notes)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('a product named like an attack is a plain label in the form and in the history', async () => {
    const name = '<img src=x onerror=alert(1)>';
    const evil = productOf('p-evil', name, 'Aqua, Glycerin, Panthenol, Allantoin, Squalane');
    open([{ ...entry('a', ago(1), {}, 'with it'), newProductIds: ['p-evil'] }], {
      products: [evil],
    });
    expect(
      await screen.findByText(t('journal.entryNewProducts', { names: name })),
    ).toBeInTheDocument();
    await clickAdd();
    expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('"update the profile?"', () => {
  const dry = (days: number[]) => marked('dryness', 2, days);
  const bannerText = t('journal.bannerText', {
    symptoms: t('journal.symptom.dryness').toLowerCase(),
  });

  it('3 entries: no banner', async () => {
    open(dry([0, 2, 4]));
    await screen.findByRole('heading', { name: t('journal.title') });
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it('4 entries in 14 days: the banner asks, and says the profile changes only after confirming', async () => {
    const { store } = open(dry([0, 3, 6, 9]));
    expect(await screen.findByText(bannerText)).toBeInTheDocument();
    expect(screen.getByText(t('journal.bannerHint'))).toBeInTheDocument();
    // asking changes nothing
    expect(store.getState().profile?.revision).toBe(1);
    expect(store.getState().profile?.conditions).toEqual(['stable']);
  });

  it('4 entries over 30 days: no banner', async () => {
    open(dry([0, 10, 20, 30]));
    await screen.findByRole('heading', { name: t('journal.title') });
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it('a symptom that is already a state of the profile: no banner', async () => {
    // T2 has "dehydrated" already
    renderApp('/profile/journal', {
      persona: PERSONAS.T2,
      journal: dry([0, 3, 6, 9]),
      now: APP_NOW,
    });
    await screen.findByRole('heading', { name: t('journal.title') });
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it('"Not now" hides the banner for 7 days and changes nothing else', async () => {
    const { store } = open(dry([0, 3, 6, 9]));
    fireEvent.click(await screen.findByRole('button', { name: t('journal.bannerLater') }));
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
    expect(store.getState().settings.profileSuggestionSnoozedUntil).toBe(dateAfter(APP_NOW, 7));
    expect(store.getState().profile?.revision).toBe(1);
  });

  it('a "not now" that is still in force keeps the banner away; one that is over does not', async () => {
    open(dry([0, 3, 6, 9]), { settings: { profileSuggestionSnoozedUntil: dateAfter(APP_NOW, 3) } });
    await screen.findByRole('heading', { name: t('journal.title') });
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
    cleanup();
    open(dry([0, 3, 6, 9]), { settings: { profileSuggestionSnoozedUntil: dateAfter(APP_NOW, 0) } });
    expect(await screen.findByText(bannerText)).toBeInTheDocument();
  });

  it('"Update the profile" opens the question about the skin state with the state ticked; nothing is saved yet', async () => {
    const { store } = open(dry([0, 3, 6, 9]));
    fireEvent.click(await screen.findByRole('button', { name: t('journal.bannerUpdate') }));

    const question = store.getState().testDraft;
    expect(question.currentQuestionId).toBe('q2_conditions');
    expect(question.answers['q2_conditions']).toEqual(['dehydrated']);
    expect(await screen.findByRole('checkbox', { name: 'Зневоднена' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Стабільна' })).not.toBeChecked();
    // still the old profile
    expect(store.getState().profile?.revision).toBe(1);
    expect(store.getState().profile?.conditions).toEqual(['stable']);
  });

  it('after the confirmation the revision goes +1 and the state is in the profile', async () => {
    const { store } = open(dry([0, 3, 6, 9]));
    fireEvent.click(await screen.findByRole('button', { name: t('journal.bannerUpdate') }));
    await screen.findByRole('checkbox', { name: 'Зневоднена' });
    fireEvent.click(screen.getByRole('button', { name: t('test.finish') }));
    fireEvent.click(await screen.findByRole('button', { name: t('profile.confirm') }));

    await waitFor(() => expect(store.getState().profile?.revision).toBe(2));
    const profile = store.getState().profile as SkinProfile;
    expect(profile.conditions).toEqual(['dehydrated']);
    // the cause of the symptom is not guessed anywhere
    expect(profile.baseType).toBe('normal');
  });

  it('the user can untick the suggested state: the profile then just gets +1 and stays as chosen', async () => {
    const { store } = open(dry([0, 3, 6, 9]));
    fireEvent.click(await screen.findByRole('button', { name: t('journal.bannerUpdate') }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Зневоднена' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Стабільна' }));
    fireEvent.click(screen.getByRole('button', { name: t('test.finish') }));
    fireEvent.click(await screen.findByRole('button', { name: t('profile.confirm') }));
    await waitFor(() => expect(store.getState().profile?.revision).toBe(2));
    expect(store.getState().profile?.conditions).toEqual(['stable']);
  });
});

describe('the journal without a profile', () => {
  it('still works: there is just nothing to suggest', async () => {
    renderApp('/profile/journal', {
      persona: null,
      journal: marked('dryness', 3, [0, 1, 2, 3]),
      now: APP_NOW,
    });
    expect(await screen.findByRole('heading', { name: t('journal.title') })).toBeInTheDocument();
    expect(screen.queryByText(t('journal.bannerHint'))).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });
});
