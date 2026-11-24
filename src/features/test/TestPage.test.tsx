import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import type { ContentProvider } from '@/lib/ports';
import type { TestAnswers } from '@/schemas';
import { TestProviders } from '@/test/TestProviders';
import {
  createEmptyBundle,
  createMemoryAdapter,
  createRealContent,
  createTestContent,
  createTestServices,
  createTestStore,
} from '@/test/fakes';
import { TestPage } from './pages/TestPage';
import { TestResultPage } from './pages/TestResultPage';

type Options = {
  adapter?: ReturnType<typeof createMemoryAdapter>;
  content?: ContentProvider;
  path?: string;
};

function setup({
  adapter = createMemoryAdapter(),
  content = createRealContent(),
  path = '/test',
}: Options = {}) {
  const store = createTestStore(adapter);
  const router = createMemoryRouter(
    [
      { path: '/test', element: <TestPage /> },
      { path: '/test/result', element: <TestResultPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <TestProviders services={createTestServices({ content })} store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { store, router, adapter };
}

// Starts the test from a given question with given answers (as if the user had got there).
function prefill(
  store: ReturnType<typeof createTestStore>,
  currentQuestionId: string,
  answers: TestAnswers,
) {
  act(() => {
    store.getState().actions.testDraft.set({
      answers,
      currentQuestionId,
      startedAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
  });
}

const heading = (name: string) => screen.getByRole('heading', { name });
const choose = (role: 'radio' | 'checkbox', name: string) =>
  fireEvent.click(screen.getByRole(role, { name }));
const next = () => fireEvent.click(screen.getByRole('button', { name: t('test.next') }));
const back = () => fireEvent.click(screen.getByRole('button', { name: t('test.back') }));

const Q1 = 'Визнач свій тип шкіри';
const Q2 = 'Опиши стан своєї шкіри зараз';
const Q3 = 'Яка твоя головна мета у догляді?';
const Q5 = 'Яких компонентів уникаєш у догляді?';

const REQUIRED_DONE: TestAnswers = {
  q1_base_type: 'dry',
  q2_conditions: ['dehydrated'],
  q3_goals: ['hydrate'],
  q4_reactions: ['none_noticed'],
};

describe('the first question', () => {
  it('shows question 1 with progress, without "Back", and "Next" is off until an answer is chosen', () => {
    setup();
    expect(heading(Q1)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: t('test.progressLabel') })).toHaveAttribute(
      'value',
      '1',
    );
    expect(screen.queryByRole('button', { name: t('test.back') })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('test.next') })).toBeDisabled();
    expect(screen.queryByRole('button', { name: t('test.skip') })).not.toBeInTheDocument();
    expect(screen.getByText(t('test.required'))).toBeInTheDocument();

    choose('radio', 'Суха або схильна до сухості');
    expect(screen.getByRole('button', { name: t('test.next') })).toBeEnabled();
  });

  it('a description that is not supplied yet is not invented: only the option text is shown', () => {
    setup();
    expect(
      screen.getByRole('radio', { name: 'Жирна або схильна до жирності' }),
    ).toBeInTheDocument();
    // no description lines under the options of question 1
    expect(screen.queryByText(t('common.contentPending'))).not.toBeInTheDocument();
  });

  it('saves every answer at once (autosave) with ISO dates', () => {
    const { store } = setup();
    choose('radio', 'Нормальна / резистентна');
    const draft = store.getState().testDraft;
    expect(draft.answers).toEqual({ q1_base_type: 'normal' });
    expect(draft.currentQuestionId).toBe('q1_base_type');
    expect(draft.startedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(draft.updatedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('moving between questions', () => {
  it('"Next" opens the next question and "Back" returns with the choice kept', () => {
    setup();
    choose('radio', 'Суха або схильна до сухості');
    next();
    expect(heading(Q2)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2');

    back();
    expect(heading(Q1)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Суха або схильна до сухості' })).toBeChecked();
  });

  it('the question is remembered: a reload in the middle of question 5 returns to question 5', () => {
    const adapter = createMemoryAdapter();
    setup({ adapter });
    choose('radio', 'Суха або схильна до сухості');
    next();
    choose('checkbox', 'Зневоднена');
    next();
    choose('checkbox', 'Зволожити шкіру, зменшити стягнутість і лущення');
    next();
    choose('checkbox', 'Ні, не помічала(-в)');
    next();
    expect(heading(Q5)).toBeInTheDocument();
    choose('checkbox', 'Силікони');

    cleanup(); // the page is closed
    setup({ adapter }); // and opened again over the same saved data
    expect(heading(Q5)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Силікони' })).toBeChecked();
    back();
    expect(screen.getByRole('checkbox', { name: 'Ні, не помічала(-в)' })).toBeChecked();
  });

  it('starts from the first question when the saved question no longer exists', () => {
    const { store } = setup();
    prefill(store, 'a_question_that_was_removed', {});
    expect(heading(Q1)).toBeInTheDocument();
  });
});

describe('exclusive options and free text', () => {
  it('question 4: "No" clears "Retinoids", then "Acids" clears "No"', () => {
    const { store } = setup();
    prefill(store, 'q4_reactions', { ...REQUIRED_DONE, q4_reactions: [] });
    choose('checkbox', 'Ретиноїди');
    choose('checkbox', 'Ні, не помічала(-в)');
    expect(screen.getByRole('checkbox', { name: 'Ретиноїди' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Ні, не помічала(-в)' })).toBeChecked();
    expect(store.getState().testDraft.answers.q4_reactions).toEqual(['none_noticed']);

    choose('checkbox', 'Кислоти AHA, BHA, PHA');
    expect(screen.getByRole('checkbox', { name: 'Ні, не помічала(-в)' })).not.toBeChecked();
    expect(store.getState().testDraft.answers.q4_reactions).toEqual(['acids']);
  });

  it('"Other" opens a text field that is saved and disappears with the option', () => {
    const { store } = setup();
    prefill(store, 'q3_goals', {});
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    choose('checkbox', 'Інше');
    const field = screen.getByRole('textbox', { name: t('test.otherLabel') });
    fireEvent.change(field, { target: { value: 'Свій варіант' } });
    expect(store.getState().testDraft.answers['q3_goals:other:text']).toBe('Свій варіант');

    fireEvent.change(field, { target: { value: '' } });
    expect(store.getState().testDraft.answers).not.toHaveProperty('q3_goals:other:text');

    fireEvent.change(field, { target: { value: 'Ще раз' } });
    choose('checkbox', 'Інше'); // deselected
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(store.getState().testDraft.answers).not.toHaveProperty('q3_goals:other:text');
  });
});

describe('question 6.1 and the effects', () => {
  const ANSWERS = { ...REQUIRED_DONE, q5_avoid: ['none'] };

  it('"Not relevant" does not open the effects', () => {
    const { store } = setup();
    prefill(store, 'q6_1_cycle', ANSWERS);
    choose('checkbox', 'Не актуально для мене');
    next();
    expect(heading('Скільки засобів ти зазвичай використовуєш у догляді?')).toBeInTheDocument();
    expect(store.getState().testDraft.answers).not.toHaveProperty('q6_1_effects');
  });

  it('"Yes, before menstruation" opens the effects, and "Back" from them returns to 6.1', () => {
    const { store } = setup();
    prefill(store, 'q6_1_cycle', ANSWERS);
    choose('checkbox', 'Так, перед менструацією');
    next();
    expect(
      screen.getByRole('checkbox', { name: 'Поява або посилення висипань' }),
    ).toBeInTheDocument();
    // the wording of this question is not in the supplied materials: it is shown as pending
    expect(screen.getByRole('heading', { name: t('common.contentPending') })).toBeInTheDocument();
    back();
    expect(screen.getByRole('checkbox', { name: 'Так, перед менструацією' })).toBeChecked();
  });

  it('changing 6.1 to "Not relevant" drops the effects that were chosen before', () => {
    const { store } = setup();
    prefill(store, 'q6_1_cycle', {
      ...ANSWERS,
      q6_1_cycle: ['pre_menstrual'],
      q6_1_effects: ['oilier'],
    });
    choose('checkbox', 'Не актуально для мене');
    expect(store.getState().testDraft.answers).toEqual({
      ...ANSWERS,
      q6_1_cycle: ['not_relevant'],
    });
  });
});

describe('the contradiction in question 2', () => {
  const START: TestAnswers = { q1_base_type: 'dry' };

  function atQuestion2() {
    const ctx = setup();
    prefill(ctx.store, 'q2_conditions', START);
    return ctx;
  }

  it('"Stable" with "Sensitive" asks to clarify, with two ways out', () => {
    atQuestion2();
    choose('checkbox', 'Стабільна');
    choose('checkbox', 'Чутлива');
    next();
    expect(screen.getByRole('dialog', { name: t('test.contradictionTitle') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('test.keepBoth') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('test.removeStable') })).toBeInTheDocument();
  });

  it('"Keep both" continues with both answers', () => {
    const { store } = atQuestion2();
    choose('checkbox', 'Стабільна');
    choose('checkbox', 'Реактивна');
    next();
    fireEvent.click(screen.getByRole('button', { name: t('test.keepBoth') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(heading(Q3)).toBeInTheDocument();
    expect(store.getState().testDraft.answers.q2_conditions).toEqual(['stable', 'reactive']);
  });

  it('"Remove Stable" removes it and continues', () => {
    const { store } = atQuestion2();
    choose('checkbox', 'Стабільна');
    choose('checkbox', 'З висипаннями / запаленнями');
    next();
    fireEvent.click(screen.getByRole('button', { name: t('test.removeStable') }));
    expect(heading(Q3)).toBeInTheDocument();
    expect(store.getState().testDraft.answers.q2_conditions).toEqual(['breakouts']);
  });

  it('Escape means "keep both": the test is never blocked', () => {
    const { store } = atQuestion2();
    choose('checkbox', 'Стабільна');
    choose('checkbox', 'Чутлива');
    next();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(heading(Q3)).toBeInTheDocument();
    expect(store.getState().testDraft.answers.q2_conditions).toEqual(['stable', 'sensitive']);
  });

  it('"Stable" alone or with "Dehydrated" goes on without a question', () => {
    atQuestion2();
    choose('checkbox', 'Стабільна');
    choose('checkbox', 'Зневоднена');
    next();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(heading(Q3)).toBeInTheDocument();
  });
});

describe('the whole test', () => {
  function answerRequiredAndSkipTheRest() {
    for (let step = 0; step < 20; step += 1) {
      if (screen.queryByRole('heading', { name: t('test.resultTitle') })) return;
      const skip = screen.queryByRole('button', { name: t('test.skip') });
      if (skip) {
        fireEvent.click(skip);
        continue;
      }
      const first = document.querySelector('input');
      if (!first) throw new Error('a required question must have options');
      fireEvent.click(first);
      fireEvent.click(screen.getByRole('button', { name: /^(Далі|Завершити)$/ }));
    }
  }

  it('can be finished by answering only the required questions (6, 6.1 and the safety block skipped)', () => {
    const { store, router } = setup();
    answerRequiredAndSkipTheRest();

    expect(screen.getByRole('heading', { name: t('test.resultTitle') })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/test/result');
    const draft = store.getState().testDraft;
    expect(draft.currentQuestionId).toBeNull();
    expect(draft.startedAt).not.toBeNull();
    expect(Object.keys(draft.answers)).toEqual([
      'q1_base_type',
      'q2_conditions',
      'q3_goals',
      'q4_reactions',
      'q5_avoid',
      'q7_products_count',
      'q8_care_time',
    ]);
  });

  it('the last question offers "Finish" instead of "Next"', () => {
    const { store } = setup();
    prefill(store, 'q10_age_band', {});
    expect(screen.getByRole('button', { name: t('test.finish') })).toBeEnabled();
    expect(screen.queryByRole('button', { name: t('test.next') })).not.toBeInTheDocument();
  });

  it('the safety block explains itself and can be skipped', () => {
    const { store } = setup();
    prefill(store, 'q9_safety_flags', {});
    expect(
      screen.getByText('Ці відповіді роблять рекомендації безпечнішими; їх можна пропустити'),
    ).toBeInTheDocument();
    expect(screen.getByText(t('test.optional'))).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Вагітність або планування вагітності' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('test.skip') }));
    expect(screen.getByRole('radio', { name: '18–24' })).toBeInTheDocument();
  });

  it('after the end: thanks, the raw answers stay saved, and "Try again" starts over', () => {
    const { store, router } = setup();
    answerRequiredAndSkipTheRest();
    expect(Object.keys(store.getState().testDraft.answers)).toHaveLength(7);

    fireEvent.click(screen.getByRole('button', { name: t('test.retry') }));
    expect(router.state.location.pathname).toBe('/test');
    expect(heading(Q1)).toBeInTheDocument();
    expect(store.getState().testDraft.answers).toEqual({});
    expect(store.getState().testDraft.startedAt).toBeNull();
  });

  it('a finished test sends /test to the result', async () => {
    const { router } = setup();
    answerRequiredAndSkipTheRest();
    await act(async () => {
      await router.navigate('/test');
    });
    expect(router.state.location.pathname).toBe('/test/result');
  });

  it('an unfinished test sends the result page back to /test', () => {
    const { router } = setup({ path: '/test/result' });
    expect(router.state.location.pathname).toBe('/test');
    expect(heading(Q1)).toBeInTheDocument();
  });

  it('the finished test is remembered after a reload', () => {
    const adapter = createMemoryAdapter();
    setup({ adapter });
    answerRequiredAndSkipTheRest();
    cleanup();
    const again = setup({ adapter, path: '/test/result' });
    expect(screen.getByRole('heading', { name: t('test.resultTitle') })).toBeInTheDocument();
    expect(again.router.state.location.pathname).toBe('/test/result');
  });
});

describe('edge cases of the content', () => {
  it('without any visible question (public policy: the texts are not approved yet) says it is being prepared', () => {
    setup({ content: createRealContent('public') });
    expect(screen.getByText(t('test.empty'))).toBeInTheDocument();
  });

  it('a question of type "text" is drawn from its data too', () => {
    const content = createTestContent({
      bundle: {
        ...createEmptyBundle(),
        questionnaire: [
          {
            id: 'free',
            source: 'test',
            reviewStatus: 'draft',
            type: 'text',
            text: 'Free text question',
            description: 'Some hint',
            required: true,
            options: [],
            showIf: null,
          },
        ],
      },
    });
    const { store } = setup({ content });
    expect(screen.getByText('Some hint')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('test.finish') })).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My words' } });
    expect(store.getState().testDraft.answers).toEqual({ free: 'My words' });
    fireEvent.click(screen.getByRole('button', { name: t('test.finish') }));
    expect(screen.getByRole('heading', { name: t('test.resultTitle') })).toBeInTheDocument();
  });

  it('finishing with a required answer missing returns to that question', () => {
    const { store } = setup();
    // 7 questions are required, but only the last visible one is answered and "finished" is pressed
    prefill(store, 'q10_age_band', { q10_age_band: '18_24' });
    fireEvent.click(screen.getByRole('button', { name: t('test.finish') }));
    expect(heading(Q1)).toBeInTheDocument();
    expect(store.getState().testDraft.currentQuestionId).toBe('q1_base_type');
  });
});
