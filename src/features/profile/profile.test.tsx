import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { answersFromProfile, buildProfile } from '@/logic/profile';
import { SAFETY_MESSAGE_IDS, type SkinProfile, type TestAnswers } from '@/schemas';
import { PERSONAS } from '@/test/personas';
import { TestProviders } from '@/test/TestProviders';
import {
  createFixedClock,
  createRealContent,
  createSequentialIds,
  createTestServices,
  createTestStore,
} from '@/test/fakes';
import { ProfilePage, ResultPage } from './index';
import { optionLabel } from './labels';

const NOW = Date.UTC(2026, 0, 1, 12);
const content = createRealContent();
const questions = content.bundle.questionnaire;

function setup(
  path: string,
  policy: 'demo' | 'public' = 'demo',
  prepare?: (store: ReturnType<typeof createTestStore>) => void,
) {
  const store = createTestStore();
  // The result screen sends an unfinished test away at once, so the data must be there before rendering.
  prepare?.(store);
  const router = createMemoryRouter(
    [
      { path: '/test', element: <h1>test stub</h1> },
      { path: '/test/result', element: <ResultPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/care', element: <h1>care stub</h1> },
    ],
    { initialEntries: [path] },
  );
  const services = createTestServices({
    content: createRealContent(policy),
    clock: createFixedClock(NOW),
    ids: createSequentialIds('profile'),
  });
  render(
    <TestProviders services={services} store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { store, router };
}

const finish = (store: ReturnType<typeof createTestStore>, answers: TestAnswers) =>
  act(() => {
    store.getState().actions.testDraft.set({
      answers,
      currentQuestionId: null,
      startedAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
  });

// A saved profile built from a persona, as if it had been confirmed before.
function saved(store: ReturnType<typeof createTestStore>, answers: TestAnswers): SkinProfile {
  const { profile } = buildProfile(answers, content.bundle, NOW, {
    id: 'saved-profile',
    revision: 1,
    createdAt: '2026-01-01T12:00:00.000Z',
  });
  act(() => store.getState().actions.profile.set(profile));
  return profile;
}

const messageText = (id: string) =>
  content.bundle.safetyMessages.find((message) => message.id === id)?.text ?? null;

describe('ResultPage', () => {
  it('sends an unfinished test back to /test', () => {
    const { router } = setup('/test/result');
    expect(router.state.location.pathname).toBe('/test');
  });

  it('T1: a standard result without a banner; missing texts say "being prepared"', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T1);
    });

    expect(screen.getByRole('heading', { name: t('profile.resultTitle') })).toBeInTheDocument();
    expect(screen.queryByText(t('profile.doctorBannerTitle'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Жирна або схильна до жирності' }),
    ).toBeInTheDocument();
    // the spec has no descriptions yet: the type and the condition both say so
    expect(screen.getAllByText(t('common.contentPending')).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(optionLabel(questions, 'q3_goals', 'reduce_breakouts')),
    ).toBeInTheDocument();
  });

  it('"Confirm" saves the profile with revision 1 and opens the care question', () => {
    const { store, router } = setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T1);
    });
    expect(store.getState().profile).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: t('profile.confirm') }));
    const profile = store.getState().profile;
    expect(profile?.revision).toBe(1);
    expect(profile?.id).toBe('profile-1');
    expect(profile?.baseType).toBe('oily');
    // no answer about the care yet: the next screen is "Мій догляд"
    expect(router.state.location.pathname).toBe('/care');
  });

  it('"Confirm" opens the profile when the care question was already answered', () => {
    const { router } = setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T1);
      act(() =>
        s
          .getState()
          .actions.careSetup.set({ scenario: 'none', ownedCategories: [], builtForRevision: 1 }),
      );
    });
    fireEvent.click(screen.getByRole('button', { name: t('profile.confirm') }));
    expect(router.state.location.pathname).toBe('/profile');
  });

  it('the profile is not saved until it is confirmed', () => {
    const { store } = setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T1);
    });
    expect(store.getState().profile).toBeNull();
  });

  it('a second confirmation keeps the id and the creation date and adds 1 to the revision', () => {
    const { store } = setup('/test/result', 'demo', (s) => {
      saved(s, PERSONAS.T1);
      finish(s, PERSONAS.T2);
    });
    fireEvent.click(screen.getByRole('button', { name: t('profile.confirm') }));

    const profile = store.getState().profile;
    expect(profile?.id).toBe('saved-profile');
    expect(profile?.revision).toBe(2);
    expect(profile?.createdAt).toBe('2026-01-01T12:00:00.000Z');
    expect(profile?.baseType).toBe('oily');
    expect(profile?.reactions).toEqual(['acids']);
  });

  it('T2: restrictions and the cycle suggestion are shown', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T2);
    });
    const restrictions = screen
      .getByRole('heading', { name: t('profile.restrictionsTitle') })
      .closest('section') as HTMLElement;
    expect(
      within(restrictions).getByText(optionLabel(questions, 'q4_reactions', 'acids')),
    ).toBeInTheDocument();
    expect(
      within(restrictions).getByText(
        optionLabel(questions, 'q5_avoid', 'fragrance_essential_oils'),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(t('profile.noteSuggestCycleDiary'))).toBeInTheDocument();
  });

  it('T3: a kept contradiction is said out loud', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T3);
    });
    expect(screen.getByText(t('profile.contradictionNote'))).toBeInTheDocument();
  });

  it('T6: the minor note and the "retest" note', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T6);
    });
    expect(screen.getByText(t('profile.minorNote'))).toBeInTheDocument();
    expect(screen.getByText(t('profile.noteTypeUnsureRetest'))).toBeInTheDocument();
  });

  it('T5a: the doctor banner is on top, with the text from content', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T5a);
    });
    const banner = screen.getByRole('alert');
    expect(within(banner).getByText(t('profile.doctorBannerTitle'))).toBeInTheDocument();
    expect(
      within(banner).getByText(messageText(SAFETY_MESSAGE_IDS.seeDoctor) as string),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('profile.resultTitle') })).toBeInTheDocument();
  });

  it('T5b: only the emergency message and the number, until the user confirms', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T5b);
    });

    expect(
      screen.getByRole('heading', { name: t('profile.emergencyHeading') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(messageText(SAFETY_MESSAGE_IDS.emergency) as string),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112');
    expect(
      screen.queryByRole('heading', { name: t('profile.resultTitle') }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('profile.confirm') })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('profile.emergencyAck') }));
    expect(screen.getByRole('heading', { name: t('profile.resultTitle') })).toBeInTheDocument();
    expect(screen.getByText(t('profile.doctorBannerTitle'))).toBeInTheDocument();
  });

  it('T5b with only approved content: the number is still there, the text says "being prepared"', () => {
    setup('/test/result', 'public', (s) => {
      finish(s, PERSONAS.T5b);
    });
    expect(screen.getByRole('link', { name: '112' })).toBeInTheDocument();
    expect(screen.getByText(t('common.contentPending'))).toBeInTheDocument();
  });

  it('T8: both flags are medical notes; the texts are not there yet, so nothing is invented', () => {
    setup('/test/result', 'demo', (s) => {
      finish(s, PERSONAS.T8);
    });
    const section = screen
      .getByRole('heading', { name: t('profile.medicalTitle') })
      .closest('section') as HTMLElement;
    expect(
      within(section).getByText(
        optionLabel(questions, 'q9_safety_flags', 'prescribed_derm_treatment'),
      ),
    ).toBeInTheDocument();
    expect(
      within(section).getByText(optionLabel(questions, 'q9_safety_flags', 'pregnancy_or_planning')),
    ).toBeInTheDocument();
    expect(within(section).getAllByText(t('common.contentPending'))).toHaveLength(2);
    expect(screen.queryByText(t('profile.doctorBannerTitle'))).not.toBeInTheDocument();
  });
});

describe('ProfilePage', () => {
  it('without a profile: says so and offers the test', () => {
    setup('/profile');
    expect(screen.getByText(t('profile.empty'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('profile.startTest') })).toHaveAttribute(
      'href',
      '/test',
    );
  });

  it('shows every group with its values and a "Change" button for each', () => {
    const { store } = setup('/profile');
    saved(store, PERSONAS.T2);
    // the page is already open: a store update re-renders it
    for (const key of [
      'profile.typeTitle',
      'profile.conditionsTitle',
      'profile.goalsTitle',
      'profile.restrictionsTitle',
      'profile.sensitiveTitle',
      'profile.habitsTitle',
      'profile.safetyTitle',
    ] as const) {
      expect(screen.getByRole('heading', { name: t(key) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button', { name: /^Змінити: / })).toHaveLength(7);
    expect(screen.getByText(optionLabel(questions, 'q1_base_type', 'oily'))).toBeInTheDocument();
    expect(screen.getByText(optionLabel(questions, 'q6_sex', 'female'))).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('a group without values says "not specified"', () => {
    const { store } = setup('/profile');
    saved(store, PERSONAS.T4);
    const section = screen
      .getByRole('heading', { name: t('profile.safetyTitle') })
      .closest('section') as HTMLElement;
    expect(within(section).getByText(t('profile.notSpecified'))).toBeInTheDocument();
  });

  it('"Change" asks only the questions of that group, starting from the saved answers', () => {
    const { store, router } = setup('/profile');
    const profile = saved(store, PERSONAS.T2);

    fireEvent.click(
      screen.getByRole('button', {
        name: t('profile.changeGroup', { group: t('profile.goalsTitle') }),
      }),
    );
    expect(router.state.location.pathname).toBe('/test');
    expect(router.state.location.search).toBe('?only=q3_goals');
    const draft = store.getState().testDraft;
    expect(draft.currentQuestionId).toBe('q3_goals');
    expect(draft.answers).toEqual(answersFromProfile(profile));
  });

  it('the restrictions group asks both the reactions and the avoided components', () => {
    const { store, router } = setup('/profile');
    saved(store, PERSONAS.T2);
    fireEvent.click(
      screen.getByRole('button', {
        name: t('profile.changeGroup', { group: t('profile.restrictionsTitle') }),
      }),
    );
    expect(router.state.location.search).toBe('?only=q4_reactions,q5_avoid');
  });

  it('"Retake" clears the draft but keeps the saved profile until a new one is confirmed', () => {
    const { store, router } = setup('/profile');
    saved(store, PERSONAS.T1);
    finish(store, PERSONAS.T1);
    fireEvent.click(screen.getByRole('button', { name: t('profile.retake') }));
    expect(router.state.location.pathname).toBe('/test');
    expect(store.getState().testDraft.answers).toEqual({});
    expect(store.getState().profile?.baseType).toBe('oily');
  });

  it('"Delete sensitive data" asks first; "Cancel" changes nothing', () => {
    const { store } = setup('/profile');
    saved(store, PERSONAS.T2);
    fireEvent.click(screen.getByRole('button', { name: t('profile.deleteSensitive') }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('profile.deleteCancel') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getState().profile?.sex).toBe('female');
  });

  it('"Delete sensitive data" removes sex and cycle from the profile and from the saved answers', () => {
    const { store } = setup('/profile');
    saved(store, PERSONAS.T2);
    finish(store, PERSONAS.T2);
    fireEvent.click(screen.getByRole('button', { name: t('profile.deleteSensitive') }));
    fireEvent.click(screen.getByRole('button', { name: t('profile.deleteConfirm') }));

    const profile = store.getState().profile;
    expect(profile?.sex).toBeNull();
    expect(profile?.cycle).toEqual({ status: null, phases: [], effects: [] });
    expect(profile?.revision).toBe(2);
    // everything else stays
    expect(profile?.baseType).toBe('oily');
    expect(profile?.reactions).toEqual(['acids']);
    const answers = store.getState().testDraft.answers;
    expect(answers).not.toHaveProperty('q6_sex');
    expect(answers).not.toHaveProperty('q6_1_cycle');
    expect(answers).not.toHaveProperty('q6_1_effects');
    expect(answers.q1_base_type).toBe('oily');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
