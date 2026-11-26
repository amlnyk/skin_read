import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';
import type { ContentBundle } from '@/schemas';
import { createRealContent, createTestServices } from '@/test/helpers/fakes';
import { referenceBundle } from '@/test/data/referenceContent';
import { TestProviders } from '@/test/helpers/TestProviders';
import { ReferencePage } from '../index';

afterEach(cleanup);

const real = createRealContent('demo');

function setup(
  bundle: ContentBundle = referenceBundle(real.bundle),
  policy: 'demo' | 'public' = 'demo',
) {
  const services = createTestServices({ content: { ...real, policy, bundle } });
  render(
    <TestProviders services={services}>
      <MemoryRouter>
        <ReferencePage />
      </MemoryRouter>
    </TestProviders>,
  );
}

const searchBox = () => screen.getByRole('searchbox', { name: t('reference.searchLabel') });
const search = (query: string) => fireEvent.change(searchBox(), { target: { value: query } });
// the ingredient names are rows; a tap on a row opens the card in a modal
const rows = () =>
  screen.queryAllByRole('button').filter((item) => item.getAttribute('aria-haspopup') === 'dialog');
const rowNamed = (name: string) =>
  screen.getByRole('button', { name: (label) => label.startsWith(name) });
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
    expect(rowNamed("Пом'якшувальний екстракт")).toBeInTheDocument();
    // the cards are not on the page until a name is tapped
    expect(cards()).toHaveLength(0);
  });
});

describe('ReferencePage: search', () => {
  it.each(['ніацинамід', 'niacinamide', 'NIACINAMIDE', 'Нікотинамід', 'vitamin b3'])(
    'the query "%s" gives the same one card',
    (query) => {
      setup();
      search(query);
      const found = rows();
      expect(found).toHaveLength(1);
      expect(found[0]).toHaveTextContent('Ніацинамід');
      fireEvent.click(found[0]!);
      expect(
        within(screen.getByRole('dialog')).getByRole('heading', { level: 2, name: 'Ніацинамід' }),
      ).toBeInTheDocument();
    },
  );

  it('finds a word with an apostrophe typed in any way', () => {
    setup();
    search('помякшувальний');
    expect(rows()).toHaveLength(1);
    search('ПОМ’ЯКШУВАЛЬНИЙ');
    expect(rows()).toHaveLength(1);
  });

  it('a query that is not in the base gives the empty state "Нічого не знайдено"', () => {
    setup();
    search('щось неіснуюче');
    expect(screen.getByRole('status')).toHaveTextContent(t('reference.nothingFound'));
    expect(rows()).toHaveLength(0);
  });

  it('shows how many records were found and finds a group by its name', () => {
    setup();
    search('жирні');
    expect(screen.getByText(t('reference.resultCount', { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText('Жирні спирти', { selector: 'summary span' })).toBeInTheDocument();
    // a found group is not expanded: the ingredients that match are listed on their own
    expect(rows()).toHaveLength(0);
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
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Цетеариловий спирт');
    expect(
      screen.queryByRole('heading', { name: t('reference.groupsTitle') }),
    ).not.toBeInTheDocument();

    search('ніацинамід');
    expect(screen.getByText(t('reference.nothingFound'))).toBeInTheDocument();
  });
});

describe('ReferencePage: quick filter by group', () => {
  const chip = (name: string) =>
    within(screen.getByRole('group', { name: t('reference.groupFilterLabel') })).getByRole(
      'button',
      {
        name,
      },
    );

  it('has a chip for "Усі", for every named group and for the ingredients without a group', () => {
    setup();
    const bar = screen.getByRole('group', { name: t('reference.groupFilterLabel') });
    const names = within(bar)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(names[0]).toBe(t('reference.groupFilterAll'));
    expect(names).toContain('Ніацинамід');
    expect(names).toContain('Жирні спирти');
    expect(names[names.length - 1]).toBe(t('reference.groupFilterUngrouped'));
    expect(chip(t('reference.groupFilterAll'))).toHaveAttribute('aria-pressed', 'true');
  });

  it('is one line with arrows that move it by three buttons', () => {
    const scrollTo = vi.fn();
    const sizes = { scrollWidth: 2000, clientWidth: 300 };
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      value: scrollTo,
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      get: () => sizes.scrollWidth,
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      get: () => sizes.clientWidth,
      configurable: true,
    });
    try {
      setup();
      const back = screen.getByRole('button', { name: t('reference.groupFilterBack') });
      const forward = screen.getByRole('button', { name: t('reference.groupFilterForward') });
      expect(back).toBeDisabled();
      expect(forward).toBeEnabled();
      fireEvent.click(forward);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      fireEvent.click(back);
    } finally {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTo;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    }
  });

  it('a chosen group shows only that group, open, with its cards', () => {
    setup();
    fireEvent.click(chip('Ніацинамід'));
    expect(chip('Ніацинамід')).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByText('Жирні спирти', { selector: 'summary span' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('reference.ungroupedTitle') }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Ніацинамід', { selector: 'summary span' }).closest('details'),
    ).toHaveAttribute('open');
    expect(rows()).toHaveLength(1);
  });

  it('"Інші" shows only the ingredients without a group, "Усі" brings everything back', () => {
    setup();
    fireEvent.click(chip(t('reference.groupFilterUngrouped')));
    expect(
      screen.getByRole('heading', { name: t('reference.ungroupedTitle') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('reference.groupsTitle') }),
    ).not.toBeInTheDocument();

    fireEvent.click(chip(t('reference.groupFilterAll')));
    expect(screen.getByRole('heading', { name: t('reference.groupsTitle') })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: t('reference.ungroupedTitle') }),
    ).toBeInTheDocument();
  });

  it('is hidden while searching', () => {
    setup();
    search('niacinamide');
    expect(
      screen.queryByRole('group', { name: t('reference.groupFilterLabel') }),
    ).not.toBeInTheDocument();
  });
});

describe('ReferencePage: the card of an ingredient opens in a modal', () => {
  it('a tap on a name opens the card with that name as the title', () => {
    setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(rowNamed("Пом'якшувальний екстракт"));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { level: 2, name: "Пом'якшувальний екстракт" }),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByRole('article')).toHaveLength(1);
  });

  it('closes with the button and with Escape, and shows one card at a time', () => {
    setup();
    fireEvent.click(rowNamed("Пом'якшувальний екстракт"));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: t('reference.closeCard') }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(rowNamed("Пом'якшувальний екстракт"));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the card of a group member opens from inside the open group', () => {
    setup();
    // the chip of the group opens it; the group has one ingredient
    fireEvent.click(screen.getByRole('button', { name: 'Ніацинамід' }));
    fireEvent.click(rows()[0]!);
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', { level: 2, name: 'Ніацинамід' }),
    ).toBeInTheDocument();
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
      within(scope).queryByRole('button', {
        name: (label) => label.startsWith(name),
        hidden: true,
      });
    expect(heading(denatured, 'Спирт денатурований')).toBeInTheDocument();
    expect(heading(denatured, 'Цетеариловий спирт')).not.toBeInTheDocument();
    expect(heading(fatty, 'Цетеариловий спирт')).toBeInTheDocument();
  });

  it('a card shows every field of the spec, with the source and the known interactions by name', () => {
    setup();
    search('niacinamide');
    fireEvent.click(rows()[0]!);
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
    fireEvent.click(rows()[0]!);
    const card = cards()[0]!;
    expect(within(screen.getByRole('dialog')).getByRole('heading', { level: 2 })).toHaveTextContent(
      t('common.contentPending'),
    );
    // synonyms, category, purpose, properties, cautions, usage, interactions
    expect(within(card).getAllByText(t('common.contentPending'))).toHaveLength(7);
    // facts only: no inline colours on the card
    expect(card.querySelectorAll('[style]')).toHaveLength(0);
  });
});

describe('ReferencePage: the real content', () => {
  it('shows the groups from the spec and the reference cards from the table', () => {
    setup(real.bundle);
    expect(real.bundle.ingredients.length).toBeGreaterThan(50);
    expect(screen.queryByText(t('reference.noIngredientsYet'))).not.toBeInTheDocument();
    const names = screen
      .getAllByText(/./, { selector: 'summary span:first-child' })
      .map((node) => node.textContent);
    expect(names).toHaveLength(27);
    expect(names).toContain('Ніацинамід');
    expect(names).toContain('Жирні спирти');
    expect(names).toContain('Денатурований спирт');
    // no category is filled in yet, so there is nothing to filter by
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('a card from the table: empty explanations say they are being prepared, a draft says so', () => {
    setup(real.bundle);
    search('niacinamide');
    fireEvent.click(rows()[0]!);
    const [card] = cards();
    expect(card).toBeDefined();
    expect(within(screen.getByRole('dialog')).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Ніацинамід',
    );
    expect(within(card!).getByText('Niacinamide')).toBeInTheDocument();
    const item = real.bundle.ingredients.find((entry) => entry.inci === 'Niacinamide')!;
    if (item.reviewStatus !== 'verified') {
      expect(within(card!).getByText(t('reference.draftNote'))).toBeInTheDocument();
    }
    // every empty field says it is being prepared: nothing is filled in by the app
    const empty =
      [item.category, item.purpose, item.usage].filter((value) => value === null).length +
      [item.properties, item.cautions, item.knownInteractions].filter((list) => list.length === 0)
        .length;
    expect(within(card!).queryAllByText(t('common.contentPending'))).toHaveLength(empty);
  });

  it('the search finds a component by INCI or synonym, and says when nothing is found', () => {
    setup(real.bundle);
    search('Cetearyl Alcohol');
    expect(rows().length).toBeGreaterThan(0);
    search('Ceramide 3');
    expect(rows()[0]).toHaveTextContent('Церамід NP');
    search('ніацинамід');
    expect(screen.getByText('Ніацинамід', { selector: 'summary span' })).toBeInTheDocument();
    search('no such component xyz');
    expect(screen.getByText(t('reference.nothingFound'))).toBeInTheDocument();
  });

  it('shows "Довідник ще наповнюється" when the policy hides everything', () => {
    setup(createRealContent('public').bundle, 'public');
    expect(screen.getByText(t('reference.noContent'))).toBeInTheDocument();
  });
});
