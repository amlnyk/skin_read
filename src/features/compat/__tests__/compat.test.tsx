import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { uk } from '@/i18n/uk';
import { buildProfile } from '@/logic/profile';
import type { ContentBundle, TestAnswers } from '@/schemas';
import { createRealContent, createTestServices, createTestStore } from '@/test/helpers/fakes';
import { inciContent } from '@/test/data/inciFixtures';
import { PERSONAS } from '@/test/data/personas';
import { TestProviders } from '@/test/helpers/TestProviders';
import { CompatCheckerPage } from '../index';

afterEach(cleanup);

const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
const real = createRealContent('demo');

// Invented ingredients and rules on top of the real questionnaire (for the labels).
const FIXTURE: ContentBundle = {
  ...real.bundle,
  ingredients: inciContent.ingredients,
  ingredientGroups: inciContent.ingredientGroups,
  compatRules: inciContent.compatRules,
};

type Store = ReturnType<typeof createTestStore>;

function saveProfile(store: Store, answers: TestAnswers) {
  const { profile } = buildProfile(answers, real.bundle, NOW, {
    id: 'saved-profile',
    revision: 1,
    createdAt: '2026-01-01T12:00:00.000Z',
  });
  act(() => store.getState().actions.profile.set(profile));
}

function setup(options: { bundle?: ContentBundle; answers?: TestAnswers } = {}) {
  const store = createTestStore();
  if (options.answers) saveProfile(store, options.answers);
  const services = createTestServices({ content: { ...real, bundle: options.bundle ?? FIXTURE } });
  render(
    <TestProviders services={services} store={store}>
      <MemoryRouter>
        <CompatCheckerPage />
      </MemoryRouter>
    </TestProviders>,
  );
  return store;
}

const searchBox = () => screen.getByRole('searchbox', { name: t('compat.searchLabel') });
const search = (query: string) => fireEvent.change(searchBox(), { target: { value: query } });
const pick = (name: RegExp) =>
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(`${name.source}.*(Компонент|Група)`, 'u') }),
  );
const cards = () => screen.queryAllByRole('article');

function pickBoth(first: RegExp, second: RegExp) {
  search('');
  pick(first);
  pick(second);
}

describe('CompatCheckerPage: the screen', () => {
  it('has the title, a link back and an explanation', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: t('compat.title') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('compat.back') })).toHaveAttribute(
      'href',
      '/reference',
    );
    expect(screen.getByText(t('compat.intro'))).toBeInTheDocument();
  });

  it('says that there is nothing to check yet when the content has no ingredients and groups', () => {
    setup({ bundle: { ...FIXTURE, ingredients: [], ingredientGroups: [] } });
    expect(screen.getByText(t('compat.noContent'))).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('asks for at least two components and shows no cards until then', () => {
    setup();
    expect(screen.getByText(t('compat.needMore'))).toBeInTheDocument();
    pick(/Ретинол/u);
    expect(screen.getByText(t('compat.needMore'))).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it('the choices are toggle buttons that can be taken back', () => {
    setup();
    const button = () => screen.getByRole('button', { name: /Ретинол.*Компонент/u });
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button());
    expect(button()).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: t('compat.remove', { name: 'Ретинол' }) }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('compat.remove', { name: 'Ретинол' }) }));
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(t('compat.selectedEmpty'))).toBeInTheDocument();
  });

  it('searches components and groups by name, INCI and synonym', () => {
    setup();
    search('vitamin c');
    expect(screen.getByRole('button', { name: /Аскорбінова кислота/u })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ретинол/u })).not.toBeInTheDocument();
    search('qqqq');
    expect(screen.getByText(t('compat.nothingFound'))).toBeInTheDocument();
  });

  it('can pick a group as well as an ingredient', () => {
    setup();
    pickBoth(/Ретиноїди/u, /AHA-кислоти/u);
    expect(cards()).toHaveLength(1);
    expect(within(cards()[0]!).getByText(t('compat.status.caution.title'))).toBeInTheDocument();
  });

  it('stops at the limit and says so', () => {
    setup();
    const names = [
      /Вода/u,
      /Гліцерин/u,
      /Ретинол/u,
      /Молочна кислота/u,
      /Ніацинамід/u,
      /Аскорбінова кислота/u,
      /Гліколева кислота/u,
      /Пантенол/u,
    ];
    for (const name of names) pick(name);
    expect(screen.getByText(t('compat.limitReached', { count: 8 }))).toBeInTheDocument();
    // a ninth choice is not possible, but a chosen one can still be taken back
    expect(screen.getByRole('button', { name: /Squalane.*Компонент/u })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ретинол.*Компонент/u })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Ретинол.*Компонент/u }));
    expect(screen.getByRole('button', { name: /Squalane.*Компонент/u })).toBeEnabled();
  });
});

describe('CompatCheckerPage: results', () => {
  it('shows a caution with the explanation, the timing advice, the source and the review status', () => {
    setup();
    pickBoth(/Ретинол/u, /Молочна кислота/u);
    const [card] = cards();
    expect(card).toBeDefined();
    const view = within(card!);
    expect(view.getByRole('heading', { name: 'Ретинол + Молочна кислота' })).toBeInTheDocument();
    expect(view.getByText(t('compat.status.caution.title'))).toBeInTheDocument();
    expect(view.getByText(t('compat.status.caution.text'))).toBeInTheDocument();
    expect(view.getByText('Test caution explanation (ingredient level).')).toBeInTheDocument();
    expect(view.getByText('Test timing advice (ingredient level).')).toBeInTheDocument();
    expect(view.getByText('test fixture')).toBeInTheDocument();
    expect(view.getByText(t('compat.reviewStatus.draft'))).toBeInTheDocument();
  });

  it('shows the status by an icon and by words, and the icon is hidden from screen readers', () => {
    setup();
    pickBoth(/Ретинол/u, /Молочна кислота/u);
    const card = cards()[0]!;
    const icon = card.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(
      within(card).getByRole('group', { name: t('compat.status.caution.title') }),
    ).toBeInTheDocument();
  });

  it('raises the caution for a saved profile with a listed condition and names the reason', () => {
    setup({ answers: PERSONAS.T2 });
    expect(screen.getByText(t('compat.profileUsed'))).toBeInTheDocument();
    pickBoth(/Ретинол/u, /Молочна кислота/u);
    const view = within(cards()[0]!);
    expect(
      view.getByText(t('compat.status.not_recommended_for_profile.title')),
    ).toBeInTheDocument();
    expect(view.getByText(t('compat.reason.rule_escalated'))).toBeInTheDocument();
    expect(view.getByText(t('compat.conditionsLabel'))).toBeInTheDocument();
    // worded with the label the questionnaire showed for that answer
    const sensitive = real.bundle.questionnaire
      .find((question) => question.id === 'q2_conditions')
      ?.options.find((option) => option.id === 'sensitive')?.label;
    expect(sensitive).toBeDefined();
    expect(view.getByText(sensitive!)).toBeInTheDocument();
  });

  it('stays a caution for a profile without the listed values', () => {
    setup({ answers: PERSONAS.T1 });
    pickBoth(/Ретинол/u, /Молочна кислота/u);
    expect(within(cards()[0]!).getByText(t('compat.status.caution.title'))).toBeInTheDocument();
  });

  it('says that the profile is not used when there is none', () => {
    setup();
    expect(screen.getByText(t('compat.profileNone'))).toBeInTheDocument();
  });

  it('shows an info rule as "no known conflicts" with its explanation', () => {
    setup();
    pickBoth(/Ніацинамід/u, /Аскорбінова кислота/u);
    const view = within(cards()[0]!);
    expect(view.getByText(t('compat.status.no_known_conflicts.title'))).toBeInTheDocument();
    expect(
      view.getByText('Test info explanation (niacinamide and vitamin C).'),
    ).toBeInTheDocument();
  });

  it('a pair without a rule says "within the available data", never "safe"', () => {
    setup();
    pickBoth(/Гліцерин/u, /Пантенол/u);
    const card = cards()[0]!;
    const view = within(card);
    expect(view.getByText(t('compat.status.no_known_conflicts.title'))).toBeInTheDocument();
    expect(view.getByText(t('compat.reason.no_rule'))).toBeInTheDocument();
    expect(card.textContent).toMatch(/у межах наявних даних/iu);
    expect(card.textContent).not.toMatch(/безпечно|заборонено/iu);
    // no rule means no rule text, source or status to show
    expect(view.queryByText(t('compat.explanationLabel'))).not.toBeInTheDocument();
  });

  it('says "Інформація готується" when a rule has no text yet', () => {
    setup();
    pickBoth(/Аскорбінова кислота/u, /Гліколева кислота/u);
    const view = within(cards()[0]!);
    expect(view.getByText(t('compat.status.caution.title'))).toBeInTheDocument();
    expect(view.getAllByText(t('compat.textPending'))).toHaveLength(2);
  });

  it('puts the most important result first for three components', () => {
    setup();
    search('');
    pick(/Гліцерин/u);
    pick(/Ретинол/u);
    pick(/Молочна кислота/u);
    const titles = cards().map((card) => within(card).getByRole('heading').textContent);
    expect(titles).toHaveLength(3);
    expect(titles[0]).toBe('Ретинол + Молочна кислота');
  });

  it('works with the real content: two groups without a rule give "no known conflicts"', () => {
    const realBundle = createRealContent('demo').bundle;
    expect(realBundle.ingredientGroups.length).toBeGreaterThan(1);
    setup({ bundle: realBundle });
    const options = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'));
    fireEvent.click(options[0]!);
    fireEvent.click(options[1]!);
    const [card] = cards();
    expect(card).toBeDefined();
    expect(
      within(card!).getByText(t('compat.status.no_known_conflicts.title')),
    ).toBeInTheDocument();
    expect(card!.textContent).not.toMatch(/безпечно|заборонено/iu);
  });
});

describe('the texts of the compat screen', () => {
  const collect = (node: unknown): string[] =>
    typeof node === 'string'
      ? [node]
      : typeof node === 'object' && node !== null
        ? Object.values(node).flatMap(collect)
        : [];

  it('never use the words "безпечно" or "заборонено"', () => {
    const texts = collect(uk.compat);
    expect(texts.length).toBeGreaterThan(30);
    for (const text of texts) expect(text).not.toMatch(/безпечно|заборонен/iu);
  });

  it('keep the four status texts of the specification', () => {
    expect(uk.compat.status.no_known_conflicts.title).toBe('Не виявлено відомих конфліктів');
    expect(uk.compat.status.caution.title).toBe('Потребує обережності');
    expect(uk.compat.status.not_recommended_for_profile.title).toBe(
      'Не рекомендовано для поточного профілю',
    );
    expect(uk.compat.status.insufficient_info.title).toBe('Недостатньо інформації');
  });
});
