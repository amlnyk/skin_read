import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { buildProfile } from '@/logic/profile';
import { QUESTION_IDS, SAFETY_MESSAGE_IDS, type ContentBundle, type TestAnswers } from '@/schemas';
import {
  createMemoryAdapter,
  createFixedClock,
  createRealContent,
  createSequentialIds,
  createTestServices,
  createTestStore,
} from '@/test/helpers/fakes';
import { PERSONAS } from '@/test/data/personas';
import {
  BASE_INFOS,
  OPT_ACID,
  OPT_ANTI_AGE,
  OPT_BREAKOUTS,
  OPT_HYDRATE_AM,
} from '@/test/data/routineContent';
import { TestProviders } from '@/test/helpers/TestProviders';
import { RoutinePage } from '../index';

const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime(); // noon of a local day
const DAY = 24 * 60 * 60 * 1000;
const real = createRealContent('demo');

const GROUP = {
  id: 'group-a',
  source: 'test fixture',
  reviewStatus: 'draft' as const,
  nameUk: 'Тестова група',
  description: null,
  patterns: [],
};

// The real questionnaire (for the labels) with test routine records.
function bundleWith(routineSteps: ContentBundle['routineSteps']): ContentBundle {
  return { ...real.bundle, ingredientGroups: [GROUP], routineSteps };
}
const FIXTURE = bundleWith([...BASE_INFOS, OPT_BREAKOUTS, OPT_ANTI_AGE, OPT_HYDRATE_AM, OPT_ACID]);

type Store = ReturnType<typeof createTestStore>;

function profileOf(answers: TestAnswers, revision = 1) {
  return buildProfile(answers, FIXTURE, NOW, {
    id: 'saved-profile',
    revision,
    createdAt: '2026-01-01T12:00:00.000Z',
  }).profile;
}

function savedProfile(store: Store, answers: TestAnswers, revision = 1) {
  act(() => {
    store.getState().actions.profile.set(profileOf(answers, revision));
    // the last test is finished: its answers stay in the draft, like in the app
    store.getState().actions.testDraft.set({
      answers,
      currentQuestionId: null,
      startedAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
  });
}

function setup(
  options: {
    bundle?: ContentBundle;
    store?: Store;
    now?: number;
    prepare?: (store: Store) => void;
  } = {},
) {
  const store = options.store ?? createTestStore();
  options.prepare?.(store);
  const router = createMemoryRouter(
    [
      { path: '/care', element: <RoutinePage /> },
      { path: '/test', element: <h1>test stub</h1> },
      { path: '/scan', element: <h1>scan stub</h1> },
    ],
    { initialEntries: ['/care'] },
  );
  const services = createTestServices({
    content: { ...real, bundle: options.bundle ?? FIXTURE },
    clock: createFixedClock(options.now ?? NOW),
    ids: createSequentialIds('id'),
  });
  render(
    <TestProviders services={services} store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { store, router };
}

type Owned = ('cleanser' | 'moisturizer' | 'sunscreen')[];

/** A saved profile and an answered care question: the routine is built and shown. */
function built(
  answers: TestAnswers,
  scenario: 'none' | 'have' | 'partial' | 'skipped' = 'none',
  owned: Owned = [],
) {
  const context = setup({ prepare: (s) => savedProfile(s, answers) });
  choose(scenario, owned);
  return context;
}

function clickOwned(categories: Owned) {
  for (const category of categories) {
    fireEvent.click(screen.getByRole('checkbox', { name: t(`category.${category}`) }));
  }
}

function choose(scenario: 'none' | 'have' | 'partial' | 'skipped', owned: Owned = []) {
  const labels = {
    none: 'care.scenarioNone',
    have: 'care.scenarioHave',
    partial: 'care.scenarioPartial',
    skipped: 'care.scenarioSkip',
  } as const;
  fireEvent.click(screen.getByRole('button', { name: t(labels[scenario]) }));
  if (scenario === 'have' || scenario === 'partial') {
    clickOwned(owned);
    fireEvent.click(screen.getByRole('button', { name: t('care.ownedBuild') }));
  }
}

const stepNames = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const openTab = (key: 'care.tabAm' | 'care.tabPm' | 'care.tabShopping') =>
  fireEvent.click(screen.getByRole('tab', { name: t(key) }));
const label = (questionId: string, optionId: string) =>
  real.bundle.questionnaire.find((q) => q.id === questionId)?.options.find((o) => o.id === optionId)
    ?.label ?? '';

describe('before the routine exists', () => {
  it('without a profile: asks to take the test', () => {
    setup();
    expect(screen.getByText(t('care.needsProfile'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('care.startTest') })).toHaveAttribute(
      'href',
      '/test',
    );
  });

  it('with a profile: asks if the user already has a routine, with four answers', () => {
    setup({ prepare: (s) => savedProfile(s, PERSONAS.T1) });
    expect(screen.getByRole('heading', { name: t('care.scenarioQuestion') })).toBeInTheDocument();
    for (const key of [
      'care.scenarioNone',
      'care.scenarioHave',
      'care.scenarioPartial',
      'care.scenarioSkip',
    ] as const) {
      expect(screen.getByRole('button', { name: t(key) })).toBeInTheDocument();
    }
  });
});

describe('scenarios', () => {
  it('"No": the routine is built at once and the answer is saved', () => {
    const { store } = built(PERSONAS.T1, 'none');
    const state = store.getState();
    expect(state.careSetup).toEqual({ scenario: 'none', ownedCategories: [], builtForRevision: 1 });
    expect(state.routine.map((routine) => routine.slot)).toEqual(['am', 'pm']);
    expect(stepNames()).toEqual(['1. Очищення', '2. Зволоження', '3. Сонцезахист']);
  });

  it('"Skip": the same as "No", the answer is remembered', () => {
    const { store } = built(PERSONAS.T1, 'skipped');
    expect(store.getState().careSetup.scenario).toBe('skipped');
    expect(store.getState().routine).toHaveLength(2);
    expect(store.getState().careSetup.ownedCategories).toEqual([]);
  });

  it('"Partly" with a moisturizer: the step is marked as owned', () => {
    const { store } = built(PERSONAS.T1, 'partial', ['moisturizer']);
    expect(store.getState().careSetup.ownedCategories).toEqual(['moisturizer']);
    const am = store.getState().routine.find((r) => r.slot === 'am');
    expect(am?.steps.map((s) => s.status)).toEqual(['to_choose', 'owned', 'to_choose']);
    expect(screen.getByText(t('stepStatus.owned'))).toBeInTheDocument();
  });

  it('"Yes": all three base categories owned', () => {
    const { store } = built(PERSONAS.T1, 'have', ['cleanser', 'moisturizer', 'sunscreen']);
    const am = store.getState().routine.find((r) => r.slot === 'am');
    expect(am?.steps.every((s) => s.status === 'owned')).toBe(true);
  });

  it('"Back" from the list of categories returns to the question', () => {
    setup({ prepare: (s) => savedProfile(s, PERSONAS.T1) });
    fireEvent.click(screen.getByRole('button', { name: t('care.scenarioHave') }));
    expect(screen.getByRole('heading', { name: t('care.ownedTitle') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('care.ownedBack') }));
    expect(screen.getByRole('heading', { name: t('care.scenarioQuestion') })).toBeInTheDocument();
  });

  it('the user can change the answer and come back without changing anything', () => {
    const { store } = built(PERSONAS.T1, 'none');
    fireEvent.click(screen.getByRole('button', { name: t('care.changeScenario') }));
    expect(screen.getByRole('heading', { name: t('care.scenarioQuestion') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('care.addCancel') }));
    expect(stepNames()).toHaveLength(3);
    expect(store.getState().careSetup.scenario).toBe('none');
  });
});

describe('personas on the screen', () => {
  it('T1: morning of 3 steps, evening of 2 base steps and 1 optional step', () => {
    built(PERSONAS.T1);
    expect(stepNames()).toHaveLength(3);
    openTab('care.tabPm');
    expect(stepNames()).toEqual(['1. Очищення', '2. Зволоження', `3. title opt-breakouts`]);
    expect(screen.getByText(t('stepStatus.optional'))).toBeInTheDocument();
    expect(screen.getByText('purpose opt-breakouts')).toBeInTheDocument();
  });

  it('T2: no optional step in either routine; the reaction and the wish are shown at the steps', () => {
    built(PERSONAS.T2);
    expect(stepNames()).toHaveLength(3);
    expect(screen.queryByText(t('stepStatus.optional'))).not.toBeInTheDocument();
    openTab('care.tabPm');
    expect(stepNames()).toHaveLength(2);
    expect(screen.queryByText(t('stepStatus.optional'))).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        t('care.warningReaction', { name: label(QUESTION_IDS.reactions, 'acids') }),
      ).length,
    ).toBe(2);
    expect(
      screen.getAllByText(
        t('care.warningAvoid', { name: label(QUESTION_IDS.avoid, 'fragrance_essential_oils') }),
      ).length,
    ).toBe(2);
  });

  it('T5a: the doctor banner is on top with the text from content, no optional step', () => {
    built(PERSONAS.T5a);
    const banner = screen.getByRole('alert');
    const text = real.bundle.safetyMessages.find(
      (m) => m.id === SAFETY_MESSAGE_IDS.seeDoctor,
    )?.text;
    expect(within(banner).getByText(text as string)).toBeInTheDocument();
    openTab('care.tabPm');
    expect(screen.queryByText(t('stepStatus.optional'))).not.toBeInTheDocument();
  });

  it('T5b: the emergency of the last test also gives the banner', () => {
    built(PERSONAS.T5b);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('T6: no anti-age step', () => {
    built(PERSONAS.T6);
    openTab('care.tabPm');
    expect(screen.queryByText('title opt-anti-age')).not.toBeInTheDocument();
  });

  it("T8: the note about the doctor's scheme, no active steps", () => {
    built(PERSONAS.T8);
    expect(screen.getByText(t('care.noteFollowDoctorScheme'))).toBeInTheDocument();
    openTab('care.tabPm');
    expect(screen.queryByText(t('stepStatus.optional'))).not.toBeInTheDocument();
  });

  it('a standard profile has no notes and no banner', () => {
    built(PERSONAS.T1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(t('care.noteNoExtraSteps'))).not.toBeInTheDocument();
  });

  it('with the real content (no texts yet) every step says "being prepared" and nothing is invented', () => {
    setup({ bundle: real.bundle, prepare: (s) => savedProfile(s, PERSONAS.T1) });
    choose('none');
    // purpose and components of each of the 3 steps
    expect(screen.getAllByText(t('common.contentPending'))).toHaveLength(6);
    openTab('care.tabPm');
    expect(screen.queryByText(t('stepStatus.optional'))).not.toBeInTheDocument();
  });

  it('the components to look for are named by the content', () => {
    built(PERSONAS.T1);
    // only the cleanser has components in the fixture
    expect(screen.getByText(GROUP.nameUk)).toBeInTheDocument();
  });
});

describe('editing', () => {
  const am = (store: Store) => store.getState().routine.find((r) => r.slot === 'am');

  it('moves a step with the buttons, the first cannot go up and the last cannot go down', () => {
    const { store } = built(PERSONAS.T1);
    expect(
      screen.getByRole('button', { name: t('care.moveUpLabel', { name: 'Очищення' }) }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: t('care.moveDownLabel', { name: 'Сонцезахист' }) }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', { name: t('care.moveDownLabel', { name: 'Очищення' }) }),
    );
    expect(am(store)?.steps.map((s) => s.category)).toEqual([
      'moisturizer',
      'cleanser',
      'sunscreen',
    ]);
    expect(stepNames()).toEqual(['1. Зволоження', '2. Очищення', '3. Сонцезахист']);
  });

  it('removes a step', () => {
    const { store } = built(PERSONAS.T1);
    fireEvent.click(
      screen.getByRole('button', { name: t('care.removeLabel', { name: 'Зволоження' }) }),
    );
    expect(am(store)?.steps.map((s) => s.category)).toEqual(['cleanser', 'sunscreen']);
    expect(stepNames()).toEqual(['1. Очищення', '2. Сонцезахист']);
  });

  it('adds the own step to the end', () => {
    const { store } = built(PERSONAS.T1);
    fireEvent.click(screen.getByRole('button', { name: t('care.add') }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: t('category.serum') }),
    );
    expect(am(store)?.steps[3]).toMatchObject({
      id: 'user-id-1',
      category: 'serum',
      status: 'to_choose',
    });
    expect(stepNames()[3]).toBe('4. Сироватка');
    // the dialog is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sunscreen cannot be added to the evening', () => {
    built(PERSONAS.T1);
    openTab('care.tabPm');
    fireEvent.click(screen.getByRole('button', { name: t('care.add') }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).queryByRole('button', { name: t('category.sunscreen') }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: t('category.serum') })).toBeInTheDocument();
  });

  it('the dialog can be cancelled', () => {
    const { store } = built(PERSONAS.T1);
    fireEvent.click(screen.getByRole('button', { name: t('care.add') }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: t('care.addCancel') }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(am(store)?.steps).toHaveLength(3);
  });

  it('a rebuild asks first and then puts the routine back as the profile says', () => {
    const { store } = built(PERSONAS.T1);
    fireEvent.click(
      screen.getByRole('button', { name: t('care.removeLabel', { name: 'Зволоження' }) }),
    );
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuild') }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(am(store)?.steps).toHaveLength(2); // nothing changed yet
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuildConfirm') }));
    expect(am(store)?.steps).toHaveLength(3);
  });

  it('a rebuild can be cancelled', () => {
    const { store } = built(PERSONAS.T1);
    fireEvent.click(
      screen.getByRole('button', { name: t('care.removeLabel', { name: 'Зволоження' }) }),
    );
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuild') }));
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuildCancel') }));
    expect(am(store)?.steps).toHaveLength(2);
  });

  it('says that the profile changed after the routine was built, and the rebuild clears it', () => {
    const { store } = built(PERSONAS.T1);
    expect(screen.queryByText(t('care.profileChanged'))).not.toBeInTheDocument();
    act(() => store.getState().actions.profile.update({ revision: 2 }));
    expect(screen.getByText(t('care.profileChanged'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('care.rebuild') }));
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuildConfirm') }));
    expect(store.getState().careSetup.builtForRevision).toBe(2);
    expect(screen.queryByText(t('care.profileChanged'))).not.toBeInTheDocument();
  });
});

describe('"done today"', () => {
  const checkbox = () => screen.getAllByRole('checkbox', { name: t('care.doneToday') });

  it('marks a step, counts the steps and saves the mark', () => {
    const { store } = built(PERSONAS.T1);
    expect(screen.getByText(t('care.doneSummary', { done: 0, total: 3 }))).toBeInTheDocument();

    fireEvent.click(checkbox()[0] as HTMLElement);
    expect(screen.getByText(t('care.doneSummary', { done: 1, total: 3 }))).toBeInTheDocument();
    expect(store.getState().routineLog).toEqual([
      { date: '2026-06-10', slot: 'am', doneStepIds: ['am-cleanser'] },
    ]);

    fireEvent.click(checkbox()[0] as HTMLElement);
    expect(screen.getByText(t('care.doneSummary', { done: 0, total: 3 }))).toBeInTheDocument();
  });

  it('the mark stays after a reload and is gone the next day', () => {
    const adapter = createMemoryAdapter();
    const store = createTestStore(adapter);
    setup({ store, prepare: (s) => savedProfile(s, PERSONAS.T1) });
    choose('none');
    fireEvent.click(checkbox()[0] as HTMLElement);
    expect(store.getState().routineLog).toHaveLength(1);

    // a reload on the same day: a new store over the same storage
    cleanup();
    setup({ store: createTestStore(adapter) });
    expect(screen.getByText(t('care.doneSummary', { done: 1, total: 3 }))).toBeInTheDocument();
    expect((checkbox()[0] as HTMLInputElement).checked).toBe(true);

    // the next day: the entry is still saved, but the screen starts empty
    cleanup();
    const tomorrow = setup({ store: createTestStore(adapter), now: NOW + DAY });
    expect(screen.getByText(t('care.doneSummary', { done: 0, total: 3 }))).toBeInTheDocument();
    expect((checkbox()[0] as HTMLInputElement).checked).toBe(false);
    expect(tomorrow.store.getState().routineLog).toHaveLength(1);
  });

  it('the morning and the evening marks are kept apart', () => {
    const { store } = built(PERSONAS.T1);
    fireEvent.click(checkbox()[0] as HTMLElement);
    openTab('care.tabPm');
    expect(screen.getByText(t('care.doneSummary', { done: 0, total: 3 }))).toBeInTheDocument();
    expect(store.getState().routineLog).toHaveLength(1);
  });
});

describe('shopping needs', () => {
  it('T1 from scratch: 3 base items, the optional one, the others "not needed now"', () => {
    built(PERSONAS.T1);
    openTab('care.tabShopping');
    expect(screen.getByRole('heading', { name: t('care.groupBase') })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('care.groupOptional') })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('care.groupNotNow') })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: t('care.groupMissing') })).not.toBeInTheDocument();
    expect(screen.getByText(t('care.shoppingNoBrands'))).toBeInTheDocument();
    const base = screen
      .getByRole('heading', { name: t('care.groupBase') })
      .closest('section') as HTMLElement;
    expect(
      within(base)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Очищення', 'Зволоження', 'Сонцезахист']);
  });

  it('"Partly" with a moisturizer: the cleanser and sunscreen are "missing", the moisturizer is not listed', () => {
    built(PERSONAS.T1, 'partial', ['moisturizer']);
    openTab('care.tabShopping');
    const missing = screen
      .getByRole('heading', { name: t('care.groupMissing') })
      .closest('section') as HTMLElement;
    expect(
      within(missing)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Очищення', 'Сонцезахист']);
    expect(screen.queryByRole('heading', { name: t('care.groupBase') })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Зволоження' })).not.toBeInTheDocument();
  });

  it('every item leads to the scanner for its category', () => {
    built(PERSONAS.T1);
    openTab('care.tabShopping');
    const links = screen.getAllByRole('link', { name: t('care.checkProduct') });
    expect(links[0]).toHaveAttribute('href', '/scan?category=cleanser');
    expect(links).toHaveLength(4); // 3 base items and the optional one
  });

  it('"done" is saved and "remove" hides the item for good', () => {
    const { store: appStore } = built(PERSONAS.T1);
    openTab('care.tabShopping');
    fireEvent.click(
      screen.getByRole('checkbox', { name: t('care.needDone', { name: 'Очищення' }) }),
    );
    expect(appStore.getState().needs).toEqual([
      { id: 'need-cleanser', done: true, dismissed: false },
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: t('care.needRemove', { name: 'Очищення' }) }),
    );
    expect(appStore.getState().needs).toEqual([
      { id: 'need-cleanser', done: true, dismissed: true },
    ]);
    expect(screen.queryByRole('heading', { level: 3, name: 'Очищення' })).not.toBeInTheDocument();

    // the item stays hidden after a rebuild of the routine
    openTab('care.tabAm');
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuild') }));
    fireEvent.click(screen.getByRole('button', { name: t('care.rebuildConfirm') }));
    openTab('care.tabShopping');
    expect(screen.queryByRole('heading', { level: 3, name: 'Очищення' })).not.toBeInTheDocument();
  });

  it('T2: the candidates stand under "not needed now" with the reason, without a link to the scanner', () => {
    built(PERSONAS.T2);
    openTab('care.tabShopping');
    const notNow = screen
      .getByRole('heading', { name: t('care.groupNotNow') })
      .closest('section') as HTMLElement;
    expect(within(notNow).getAllByText(t('care.reasonMode'))).toHaveLength(4);
    expect(within(notNow).queryByRole('link')).not.toBeInTheDocument();
  });

  it('with no need at all the list says so', () => {
    const { store: appStore } = built(PERSONAS.T1, 'have', [
      'cleanser',
      'moisturizer',
      'sunscreen',
    ]);
    openTab('care.tabShopping');
    // only the optional step and the candidates remain: hide them all
    for (const item of screen.getAllByRole('button', {
      name: new RegExp(t('care.needRemoveShort')),
    })) {
      fireEvent.click(item);
    }
    expect(screen.getByText(t('care.shoppingEmpty'))).toBeInTheDocument();
    expect(appStore.getState().needs.every((n) => n.dismissed)).toBe(true);
  });
});
