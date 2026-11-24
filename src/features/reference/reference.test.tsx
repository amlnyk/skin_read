import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import type { ContentBundle } from '@/schemas';
import { createRealContent, createTestServices } from '@/test/fakes';
import { referenceBundle } from '@/test/referenceContent';
import { TestProviders } from '@/test/TestProviders';
import { ReferencePage } from './index';

afterEach(cleanup);

const real = createRealContent('demo');

function setup(
  bundle: ContentBundle = referenceBundle(real.bundle),
  policy: 'demo' | 'public' = 'demo',
) {
  const services = createTestServices({ content: { ...real, policy, bundle } });
  render(
    <TestProviders services={services}>
      <ReferencePage />
    </TestProviders>,
  );
}

const searchBox = () => screen.getByRole('searchbox', { name: t('reference.searchLabel') });
const search = (query: string) => fireEvent.change(searchBox(), { target: { value: query } });
const cards = () => screen.queryAllByRole('article');

describe('ReferencePage: the screen', () => {
  it('has the title and two tabs; the educational tab is an empty state', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: t('nav.reference') })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      t('reference.tabComponents'),
      t('reference.tabEducation'),
    ]);
    expect(screen.getByRole('tab', { name: t('reference.tabComponents') })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.click(screen.getByRole('tab', { name: t('reference.tabEducation') }));
    expect(screen.getByText(t('reference.educationEmpty'))).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: t('reference.tabComponents') }));
    expect(searchBox()).toBeInTheDocument();
  });

  it('shows the groups, and the ingredients that have no group', () => {
    setup();
    expect(screen.getByRole('heading', { name: t('reference.groupsTitle') })).toBeInTheDocument();
    expect(screen.getByText('Ніацинамід', { selector: 'summary span' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: t('reference.ungroupedTitle') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: "Пом'якшувальний екстракт" }),
    ).toBeInTheDocument();
  });
});

describe('ReferencePage: search', () => {
  it.each(['ніацинамід', 'niacinamide', 'NIACINAMIDE', 'Нікотинамід', 'vitamin b3'])(
    'the query "%s" gives the same one card',
    (query) => {
      setup();
      search(query);
      const found = cards();
      expect(found).toHaveLength(1);
      expect(
        within(found[0]!).getByRole('heading', { level: 3, name: 'Ніацинамід' }),
      ).toBeInTheDocument();
    },
  );

  it('finds a word with an apostrophe typed in any way', () => {
    setup();
    search('помякшувальний');
    expect(cards()).toHaveLength(1);
    search('ПОМ’ЯКШУВАЛЬНИЙ');
    expect(cards()).toHaveLength(1);
  });

  it('a query that is not in the base gives the empty state "Нічого не знайдено"', () => {
    setup();
    search('щось неіснуюче');
    expect(screen.getByRole('status')).toHaveTextContent(t('reference.nothingFound'));
    expect(cards()).toHaveLength(0);
  });

  it('shows how many records were found and finds a group by its name', () => {
    setup();
    search('жирні');
    expect(screen.getByText(t('reference.resultCount', { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText('Жирні спирти', { selector: 'summary span' })).toBeInTheDocument();
    // a found group is not expanded into cards: the cards that match are listed on their own
    expect(cards()).toHaveLength(0);
  });

  it('clearing the query brings back the groups', () => {
    setup();
    search('niacinamide');
    search('');
    expect(screen.getByRole('heading', { name: t('reference.groupsTitle') })).toBeInTheDocument();
  });

  it('filters by category and then hides the groups', () => {
    setup();
    const select = screen.getByRole('combobox', { name: t('reference.categoryLabel') });
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([t('reference.categoryAll'), 'Активний компонент', 'Емолент', 'Розчинник']);
    fireEvent.change(select, { target: { value: 'Емолент' } });
    expect(cards()).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Цетеариловий спирт' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('reference.groupsTitle') }),
    ).not.toBeInTheDocument();

    search('ніацинамід');
    expect(screen.getByText(t('reference.nothingFound'))).toBeInTheDocument();
  });
});

describe('ReferencePage: groups and cards', () => {
  it('Cetearyl Alcohol is not among the components of the denatured alcohol group', () => {
    setup();
    const groupOf = (name: string) =>
      screen.getByText(name, { selector: 'summary span' }).closest('details') as HTMLElement;
    const denatured = groupOf('Денатурований спирт');
    const fatty = groupOf('Жирні спирти');
    // `hidden: true`: the groups are closed <details>, their content is there but not on screen
    const heading = (scope: HTMLElement, name: string) =>
      within(scope).queryByRole('heading', { level: 3, name, hidden: true });
    expect(heading(denatured, 'Спирт денатурований')).toBeInTheDocument();
    expect(heading(denatured, 'Цетеариловий спирт')).not.toBeInTheDocument();
    expect(heading(fatty, 'Цетеариловий спирт')).toBeInTheDocument();
  });

  it('a card shows every field of the spec, with the source and the known interactions by name', () => {
    setup();
    search('niacinamide');
    const card = within(cards()[0]!);
    for (const key of [
      'reference.inci',
      'reference.synonyms',
      'reference.category',
      'reference.purpose',
      'reference.properties',
      'reference.cautions',
      'reference.usage',
      'reference.interactions',
      'reference.source',
    ] as const) {
      expect(card.getByText(t(key))).toBeInTheDocument();
    }
    expect(card.getByText('Niacinamide')).toBeInTheDocument();
    expect(card.getByText('Нікотинамід')).toBeInTheDocument();
    expect(card.getByText('Тестове пояснення призначення.')).toBeInTheDocument();
    expect(card.getByText('Тестове застереження.')).toBeInTheDocument();
    expect(card.getByText('Спирт денатурований')).toBeInTheDocument();
    expect(card.getByText('test fixture')).toBeInTheDocument();
    expect(card.queryByText(t('common.contentPending'))).not.toBeInTheDocument();
  });

  it('missing texts say "Інформація готується", and the card is not marked good or bad', () => {
    setup();
    search('pending ingredient');
    const card = cards()[0]!;
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
      t('common.contentPending'),
    );
    // name, synonyms, category, purpose, properties, cautions, usage, interactions
    expect(within(card).getAllByText(t('common.contentPending'))).toHaveLength(8);
    // facts only: no inline colours on the card
    expect(card.querySelectorAll('[style]')).toHaveLength(0);
  });
});

describe('ReferencePage: the real content', () => {
  it('shows the groups from the spec and says that the cards are being prepared', () => {
    setup(real.bundle);
    expect(screen.getByText(t('reference.noIngredientsYet'))).toBeInTheDocument();
    const names = screen
      .getAllByText(/./, { selector: 'summary span:first-child' })
      .map((node) => node.textContent);
    expect(names).toHaveLength(27);
    expect(names).toContain('Ніацинамід');
    expect(names).toContain('Жирні спирти');
    expect(names).toContain('Денатурований спирт');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('opening a group without cards or a description says so', () => {
    setup(real.bundle);
    const group = screen
      .getByText('Ніацинамід', { selector: 'summary span' })
      .closest('details') as HTMLElement;
    expect(within(group).getByText(t('common.contentPending'))).toBeInTheDocument();
    expect(within(group).getByText(t('reference.groupEmpty'))).toBeInTheDocument();
  });

  it('the search finds a group by name and has nothing else to find', () => {
    setup(real.bundle);
    search('niacinamide');
    expect(screen.getByText(t('reference.nothingFound'))).toBeInTheDocument();
    search('ніацинамід');
    expect(screen.getByText('Ніацинамід', { selector: 'summary span' })).toBeInTheDocument();
    search('Cetearyl Alcohol');
    expect(screen.getByText(t('reference.nothingFound'))).toBeInTheDocument();
  });

  it('shows "Довідник ще наповнюється" when the policy hides everything', () => {
    setup(createRealContent('public').bundle, 'public');
    expect(screen.getByText(t('reference.noContent'))).toBeInTheDocument();
  });
});
