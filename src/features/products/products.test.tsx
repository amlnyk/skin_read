import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { compositions } from '@/test/inciFixtures';
import { PERSONAS } from '@/test/personas';
import { productOf, renderApp } from '@/test/appHarness';

afterEach(cleanup);

async function fillName(name: string) {
  fireEvent.change(await screen.findByLabelText(t('products.nameLabel')), {
    target: { value: name },
  });
}

describe('adding a product', () => {
  it('a name only: saved as "needs a composition", with nothing invented, and not offered for a check', async () => {
    const { store, router } = renderApp('/care/products/new', { persona: PERSONAS.T2 });
    await fillName('My cream');
    fireEvent.click(screen.getByLabelText(t('products.modeName')));
    fireEvent.click(screen.getByRole('button', { name: t('products.save') }));

    expect(await screen.findByRole('heading', { name: 'My cream' })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/care\/products\/product-/);
    expect(screen.getByText(t('products.needsComposition'))).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t('products.check') })).not.toBeInTheDocument();
    const [saved] = store.getState().products;
    expect(saved).toMatchObject({
      name: 'My cream',
      inciRaw: '',
      ingredients: [],
      compositionSource: 'unknown',
    });
  });

  it('the name is required', async () => {
    const { store } = renderApp('/care/products/new', { persona: PERSONAS.T2 });
    fireEvent.click(await screen.findByRole('button', { name: t('products.save') }));
    expect(await screen.findByText(t('products.nameRequired'))).toBeInTheDocument();
    expect(store.getState().products).toEqual([]);
  });

  it('pasting a composition: reviewed, saved with its source, and checked on request', async () => {
    const { store, router } = renderApp('/care/products/new', { persona: PERSONAS.T2 });
    await fillName('Acid toner');
    fireEvent.change(screen.getByLabelText(t('products.pasteLabel')), {
      target: { value: compositions.F2 },
    });
    fireEvent.click(screen.getByRole('button', { name: t('products.parse') }));
    expect(
      screen.getByText(t('composition.totalLine', { total: 7, recognized: 7 })),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('products.saveAndCheck') }));

    expect(
      await screen.findByRole('group', { name: t('scan.status.personal_warnings.title') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/scan\/result\//);
    const [saved] = store.getState().products;
    expect(saved).toMatchObject({ name: 'Acid toner', compositionSource: 'pasted' });
    expect(saved?.ingredients).toHaveLength(7);
  });

  it('picking components by hand keeps the order of choosing', async () => {
    const { store } = renderApp('/care/products/new', { persona: PERSONAS.T2 });
    await fillName('Handmade');
    fireEvent.click(screen.getByLabelText(t('products.modeManual')));
    for (const [query, shown] of [
      ['Glycerin', 'Гліцерин'],
      ['Panthenol', 'Пантенол'],
    ] as const) {
      fireEvent.change(screen.getByLabelText(t('products.manualSearch')), {
        target: { value: query },
      });
      fireEvent.click(
        screen.getByRole('button', { name: t('products.manualPick', { name: shown }) }),
      );
    }
    fireEvent.click(screen.getByRole('button', { name: t('products.save') }));
    await screen.findByRole('heading', { name: 'Handmade' });
    expect(store.getState().products[0]).toMatchObject({
      compositionSource: 'manual',
      inciRaw: 'Glycerin, Panthenol',
    });
  });

  it('the label photo is shown as unavailable', async () => {
    renderApp('/care/products/new', { persona: PERSONAS.T2 });
    const photo = await screen.findByRole('button', { name: new RegExp(t('products.photoSoon')) });
    expect(photo).toBeDisabled();
  });
});

describe('the collection and the card', () => {
  it('lists the products and marks the one without a composition', async () => {
    renderApp('/care/products', {
      persona: PERSONAS.T2,
      products: [
        productOf('p1', 'Cream', compositions.F1),
        productOf('p2', 'Name only', '', { compositionSource: 'unknown' }),
      ],
    });
    await screen.findByRole('heading', { name: t('products.title') });
    const items = within(screen.getByRole('main')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(
      within(items[0] as HTMLElement).queryByText(t('products.needsComposition')),
    ).not.toBeInTheDocument();
    expect(
      within(items[1] as HTMLElement).getByText(t('products.needsComposition')),
    ).toBeInTheDocument();
  });

  it('the card of a product without a composition lets the person add one', async () => {
    const { store } = renderApp('/care/products/p1', {
      persona: PERSONAS.T2,
      products: [productOf('p1', 'Name only', '', { compositionSource: 'unknown' })],
    });
    expect(await screen.findByText(t('products.compositionUnknown'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(t('products.pasteLabel')), {
      target: { value: compositions.F1 },
    });
    fireEvent.click(screen.getByRole('button', { name: t('products.parse') }));
    fireEvent.click(screen.getAllByRole('button', { name: t('products.save') })[0] as HTMLElement);
    await waitFor(() => expect(store.getState().products[0]?.ingredients.length).toBe(9));
    expect(store.getState().products[0]?.compositionSource).toBe('pasted');
  });

  it('a missing product says so', async () => {
    renderApp('/care/products/nope', { persona: PERSONAS.T2 });
    expect(await screen.findByText(t('products.notFound'))).toBeInTheDocument();
  });
});

describe('"I had a reaction to this product" (scenario 4)', () => {
  it('marks components, raises the revision, keeps the routine fresh, and the next check warns', async () => {
    const { store, router } = renderApp('/care/products/p1', {
      persona: PERSONAS.T1,
      products: [
        productOf('p1', 'Acid toner', compositions.F2),
        productOf(
          'p2',
          'Another acid',
          'Aqua, Glycerin, Glycolic Acid, Panthenol, Allantoin, Squalane',
        ),
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: t('products.reactionButton') }));
    const dialog = await screen.findByRole('dialog', { name: t('products.reactionTitle') });
    fireEvent.click(within(dialog).getByLabelText('Гліколева кислота'));
    fireEvent.click(within(dialog).getByRole('button', { name: t('products.reactionSave') }));

    expect(await screen.findByText(t('products.reactionDone'))).toBeInTheDocument();
    const state = store.getState();
    expect(state.profile?.reactionIngredients).toEqual(['glycolic-acid']);
    expect(state.profile?.revision).toBe(2);
    expect(state.careSetup.builtForRevision).toBe(2);
    expect(state.products[0]?.userReactions).toHaveLength(1);

    // another product with the same ingredient now gives a personal warning
    router.navigate('/scan/check/p2');
    expect(
      await screen.findByRole('group', { name: t('scan.status.personal_warnings.title') }),
    ).toBeInTheDocument();
  });

  it('the button needs a saved profile and a composition', async () => {
    renderApp('/care/products/p1', {
      persona: null,
      products: [productOf('p1', 'Cream', compositions.F1)],
    });
    expect(
      await screen.findByRole('button', { name: t('products.reactionButton') }),
    ).toBeDisabled();
  });
});
