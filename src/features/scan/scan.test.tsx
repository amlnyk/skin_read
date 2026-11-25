import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { compositions } from '@/test/inciFixtures';
import { PERSONAS } from '@/test/personas';
import { productOf, renderApp } from '@/test/appHarness';

afterEach(cleanup);

async function pasteAndReview(text: string) {
  fireEvent.change(await screen.findByLabelText(t('scan.pasteLabel')), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: t('scan.parse') }));
  return screen.findByRole('heading', { name: t('scan.reviewTitle') });
}

describe('the scanner: paste, review, check', () => {
  it('the entrance offers pasting, announces the photo as unavailable and links to the history', async () => {
    renderApp('/scan', { persona: PERSONAS.T2 });
    expect(await screen.findByRole('link', { name: t('scan.pasteLink') })).toBeInTheDocument();
    const photo = screen.getByRole('button', { name: new RegExp(t('scan.photoSoon')) });
    expect(photo).toBeDisabled();
    expect(screen.getByRole('link', { name: t('scan.history') })).toHaveAttribute(
      'href',
      '/profile/history',
    );
  });

  it('F2 under T2: personal warnings, the reasons in order, the limits and the disclaimer', async () => {
    const { store, router } = renderApp('/scan/paste', { persona: PERSONAS.T2 });
    await pasteAndReview(compositions.F2);
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));

    expect(
      await screen.findByRole('group', { name: t('scan.status.personal_warnings.title') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/scan\/result\/scan-/);

    const personal = screen.getByRole('region', { name: t('scan.personalTitle') });
    const lines = within(personal)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    // reaction to acids first, then the condition (sensitive skin), the wish is in its own block
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Гліколева кислота');
    expect(lines[1]).toContain(t('scan.pending'));
    expect(screen.getByRole('region', { name: t('scan.wishTitle') })).toBeInTheDocument();

    expect(screen.getByText(t('scan.limit.concentrations_unknown'))).toBeInTheDocument();
    expect(screen.getByText(t('scan.limit.no_guarantee'))).toBeInTheDocument();
    expect(screen.getByRole('note', { name: t('disclaimer.label') })).toBeInTheDocument();
    expect(store.getState().scans).toHaveLength(1);
    expect(store.getState().scans[0]?.status).toBe('personal_warnings');
  });

  it('F4 under T1: a possible match waits for a confirmation and is not counted until then', async () => {
    renderApp('/scan/paste', { persona: PERSONAS.T1 });
    await pasteAndReview(compositions.F4);
    const possible = t('composition.possibleText', { raw: 'Niacinamlde', name: 'Ніацинамід' });
    expect(screen.getByText(possible)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: t('composition.confirmNamed', { name: 'Ніацинамід' }) }),
    );
    expect(screen.queryByText(possible)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    expect(
      await screen.findByRole('group', { name: t('scan.status.may_fit.title') }),
    ).toBeInTheDocument();
  });

  it('F4 checked without confirming: "may fit", and the match is shown as possible', async () => {
    renderApp('/scan/paste', { persona: PERSONAS.T1 });
    await pasteAndReview(compositions.F4);
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    expect(
      await screen.findByRole('group', { name: t('scan.status.may_fit.title') }),
    ).toBeInTheDocument();
    const section = screen.getByRole('region', { name: t('scan.possibleTitle') });
    expect(within(section).getByText(/Niacinamlde/)).toBeInTheDocument();
    expect(screen.getByText(t('scan.limit.possible_matches'))).toBeInTheDocument();
    // the key components do not include the possible match
    const key = screen.getByRole('region', { name: t('scan.keyTitle') });
    expect(within(key).queryByText('Ніацинамід')).not.toBeInTheDocument();
  });

  it('an unknown position can be fixed in the review and then counts', async () => {
    renderApp('/scan/paste', { persona: PERSONAS.T1 });
    await pasteAndReview('Aqua, Glycerin, Panthenol, Allantoin, Squalane, Mystery');
    expect(
      screen.getByText(t('composition.totalLine', { total: 6, recognized: 5 })),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(t('composition.fixLabel', { raw: 'Mystery' })), {
      target: { value: 'Niacinamide' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('composition.fix') }));
    expect(
      screen.getByText(t('composition.totalLine', { total: 6, recognized: 6 })),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('composition.unknownTitle') }),
    ).not.toBeInTheDocument();
  });

  it('F3 under T2: not enough information, and the full composition can be opened', async () => {
    renderApp('/scan/paste', { persona: PERSONAS.T2 });
    await pasteAndReview(compositions.F3);
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    expect(
      await screen.findByRole('group', { name: t('scan.status.insufficient_info.title') }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('scan.limit.low_coverage'))).toBeInTheDocument();
    expect(screen.getByText(t('scan.fullTitle'))).toBeInTheDocument();
  });

  it('without a saved profile the check is not offered', async () => {
    renderApp('/scan/paste', { persona: null });
    await pasteAndReview(compositions.F1);
    expect(screen.getByRole('button', { name: t('scan.check') })).toBeDisabled();
  });

  it('the review without a text asks to start from pasting', async () => {
    renderApp('/scan/review', { persona: PERSONAS.T1 });
    expect(await screen.findByText(t('scan.reviewNoText'))).toBeInTheDocument();
  });
});

describe('checking a saved product', () => {
  it('a product with a composition is checked once and the result opens', async () => {
    const { store, router } = renderApp('/scan/check/p1', {
      persona: PERSONAS.T2,
      products: [productOf('p1', 'Acid toner', compositions.F2)],
    });
    expect(
      await screen.findByRole('group', { name: t('scan.status.personal_warnings.title') }),
    ).toBeInTheDocument();
    expect(store.getState().scans).toHaveLength(1);
    expect(router.state.location.pathname).toMatch(/^\/scan\/result\//);
  });

  it('a product with only a name is not checked: it goes back to its card as "needs a composition"', async () => {
    const { store, router } = renderApp('/scan/check/p1', {
      persona: PERSONAS.T2,
      products: [productOf('p1', 'Only a name', '', { compositionSource: 'unknown' })],
    });
    expect(await screen.findByText(t('products.needsComposition'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/care/products/p1');
    expect(store.getState().scans).toEqual([]);
  });
});

describe('the history of checks', () => {
  it('an old result shows the banner after the profile changed, and "check again" makes a new one', async () => {
    const first = renderApp('/scan/check/p1', {
      persona: PERSONAS.T1,
      products: [productOf('p1', 'Cream', compositions.F1)],
    });
    expect(
      await screen.findByRole('group', { name: t('scan.status.may_fit.title') }),
    ).toBeInTheDocument();
    expect(screen.queryByText(t('scan.oldBannerTitle'))).not.toBeInTheDocument();
    const [first1] = first.store.getState().scans;
    // the second render restarts the fake id counter, so the old result gets an id of its own
    const scan = first1 ? { ...first1, id: 'scan-old' } : undefined;
    cleanup();

    // the profile moved on to revision 2
    const second = renderApp(`/scan/result/${scan?.id}`, {
      persona: PERSONAS.T1,
      profilePatch: { revision: 2 },
      scans: scan ? [scan] : [],
      products: [productOf('p1', 'Cream', compositions.F1)],
    });
    expect(await screen.findByText(t('scan.oldBannerTitle'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('scan.recheck') }));
    await waitFor(() => expect(second.store.getState().scans).toHaveLength(2));
    expect(second.store.getState().scans[1]?.profileRevision).toBe(2);
    await waitFor(() =>
      expect(screen.queryByText(t('scan.oldBannerTitle'))).not.toBeInTheDocument(),
    );
  });

  it('the list shows the newest first, marks old results and opens one', async () => {
    const seed = renderApp('/scan/check/p1', {
      persona: PERSONAS.T1,
      products: [productOf('p1', 'Cream', compositions.F1)],
    });
    await screen.findByRole('group', { name: t('scan.status.may_fit.title') });
    const [scan] = seed.store.getState().scans;
    cleanup();

    renderApp('/profile/history', {
      persona: PERSONAS.T1,
      profilePatch: { revision: 3 },
      scans: scan ? [scan] : [],
    });
    expect(await screen.findByText(t('scan.oldBannerTitle'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: t('scan.historyOpen') }));
    expect(await screen.findByRole('heading', { name: 'Cream' })).toBeInTheDocument();
  });

  it('an empty history says so', async () => {
    renderApp('/profile/history', { persona: PERSONAS.T1 });
    expect(await screen.findByText(t('scan.historyEmpty'))).toBeInTheDocument();
  });

  it('an unknown result id says so', async () => {
    renderApp('/scan/result/nope', { persona: PERSONAS.T1 });
    expect(await screen.findByText(t('scan.notFound'))).toBeInTheDocument();
  });
});

describe('what the screens never say', () => {
  it('no result text calls a product safe or forbidden', async () => {
    renderApp('/scan/paste', { persona: PERSONAS.T2 });
    await pasteAndReview(compositions.F2);
    fireEvent.click(screen.getByRole('button', { name: t('scan.check') }));
    await screen.findByRole('group', { name: t('scan.status.personal_warnings.title') });
    expect(document.body.textContent).not.toMatch(/безпечн|заборон|небезпечн/i);
  });
});
