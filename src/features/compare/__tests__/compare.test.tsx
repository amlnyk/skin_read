import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { analyzeProduct } from '@/logic/analyze';
import { buildProfile } from '@/logic/profile';
import { createRealContent } from '@/test/helpers/fakes';
import { inciContent } from '@/test/data/inciFixtures';
import { PERSONAS } from '@/test/data/personas';
import { APP_NOW, productOf, renderApp } from '@/test/helpers/appHarness';
import { parsePrice } from '../utils/parsePrice';

afterEach(cleanup);

// Invented compositions (not cosmetology content).
const RETINOL = 'Aqua, Glycerin, Retinol, Panthenol, Squalane, Tocopherol';
const RETINAL = 'Aqua, Glycerin, Retinal, Allantoin, Squalane, Sodium Hyaluronate';
const SHORT = 'Aqua, Glycerin';

const retinolSerum = productOf('p1', 'Serum One', RETINOL);
const retinalSerum = productOf('p2', 'Serum Two', RETINAL);
const moisturizer = productOf('p3', 'Cream Three', RETINAL, { category: 'moisturizer' });

function choose(first: string, second: string) {
  fireEvent.change(screen.getByLabelText(t('compare.firstLabel')), { target: { value: first } });
  fireEvent.change(screen.getByLabelText(t('compare.secondLabel')), { target: { value: second } });
}

describe('the compare screen', () => {
  it('without a profile asks to take the test first', async () => {
    renderApp('/care/compare', { products: [retinolSerum, retinalSerum] });
    expect(await screen.findByRole('heading', { name: t('compare.title') })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t('compare.noProfile')))).toBeInTheDocument();
    choose('p:p1', 'p:p2');
    expect(
      screen.queryByRole('heading', { name: t('compare.resultTitle') }),
    ).not.toBeInTheDocument();
  });

  it('with no products it offers to add one', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2 });
    expect(await screen.findByText(t('compare.sourcesEmpty'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('compare.addProduct') })).toHaveAttribute(
      'href',
      '/care/products/new',
    );
  });

  it('leaves out products with no composition', async () => {
    renderApp('/care/compare', {
      persona: PERSONAS.T2,
      products: [
        retinolSerum,
        productOf('bare', 'Name only', '', { compositionSource: 'unknown' }),
      ],
    });
    const select = await screen.findByLabelText(t('compare.firstLabel'));
    const names = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toEqual([t('compare.choose'), 'Serum One']);
  });

  it('two serums with a shared active group: two columns, a verdict in words and the caption', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum, retinalSerum] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p2');

    expect(screen.getByRole('heading', { name: t('compare.resultTitle') })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Serum One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Serum Two' })).toBeInTheDocument();
    expect(screen.getByText(t('compare.verdict.likely_similar_function'))).toBeInTheDocument();
    expect(screen.getByText(t('compare.caption'))).toBeInTheDocument();
    expect(screen.getByText(t('compare.sameCategory'))).toBeInTheDocument();
  });

  it('products of different categories: "different", and the caption stays', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum, moisturizer] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p3');
    expect(screen.getByText(t('compare.verdict.different'))).toBeInTheDocument();
    expect(screen.getByText(t('compare.otherCategory'))).toBeInTheDocument();
    expect(screen.getByText(t('compare.caption'))).toBeInTheDocument();
  });

  it('an incomplete composition: not enough information', async () => {
    renderApp('/care/compare', {
      persona: PERSONAS.T2,
      products: [retinolSerum, productOf('p4', 'Short one', SHORT)],
    });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p4');
    expect(screen.getByText(t('compare.verdict.insufficient_info'))).toBeInTheDocument();
  });

  it('the same product twice is not compared', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum, retinalSerum] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p1');
    expect(screen.getByText(t('compare.sameChosen'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('compare.resultTitle') }),
    ).not.toBeInTheDocument();
  });

  it('shows no price line without prices, and never a zero', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum, retinalSerum] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p2');
    expect(screen.queryByText(/Різниця в ціні/)).not.toBeInTheDocument();
    expect(screen.queryByText(t('compare.priceNeedBoth'))).not.toBeInTheDocument();
  });

  it('prices 20 and 12 in a chosen currency: a difference of 8 and the cheaper product', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum, retinalSerum] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p2');
    fireEvent.change(screen.getByLabelText(t('compare.priceA')), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(t('compare.priceB')), { target: { value: '12,00' } });
    fireEvent.change(screen.getByLabelText(t('compare.currency')), { target: { value: 'UAH' } });
    expect(
      screen.getByText(
        t('compare.priceDifference', { amount: 8, currency: 'UAH', name: 'Serum Two' }),
      ),
    ).toBeInTheDocument();
  });

  it('one price only: asks for the other and does not invent a difference', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum, retinalSerum] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 'p:p2');
    fireEvent.change(screen.getByLabelText(t('compare.priceA')), { target: { value: '20' } });
    expect(screen.getByText(t('compare.priceNeedBoth'))).toBeInTheDocument();
    expect(screen.queryByText(/Різниця в ціні/)).not.toBeInTheDocument();
  });

  it('offers the products from the history that are not in the collection', async () => {
    const built = buildProfile(PERSONAS.T2, createRealContent('demo').bundle, APP_NOW, {
      id: 'profile-1',
      revision: 1,
      createdAt: '2026-01-01T12:00:00.000Z',
    });
    const old = productOf('gone', 'Old serum', RETINAL);
    const scan = analyzeProduct({
      id: 'scan-1',
      product: old,
      profile: built.profile,
      analysis: built.analysis,
      routines: [],
      products: [],
      content: inciContent,
      now: APP_NOW,
    });
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [retinolSerum], scans: [scan] });
    await screen.findByLabelText(t('compare.firstLabel'));
    choose('p:p1', 's:scan-1');
    expect(screen.getByRole('heading', { name: 'Old serum' })).toBeInTheDocument();
    const first = screen.getByLabelText(t('compare.firstLabel'));
    expect(
      within(first).getByRole('option', { name: t('compare.fromHistory', { name: 'Old serum' }) }),
    ).toBeInTheDocument();
  });

  it('is linked from the collection and from the scanner', async () => {
    renderApp('/care/products', { persona: PERSONAS.T2 });
    expect(await screen.findByRole('link', { name: t('compare.link') })).toHaveAttribute(
      'href',
      '/care/compare',
    );
    cleanup();
    renderApp('/scan', { persona: PERSONAS.T2 });
    expect(await screen.findByRole('link', { name: t('compare.link') })).toHaveAttribute(
      'href',
      '/care/compare',
    );
  });
});

describe('parsePrice', () => {
  it('reads a number with a dot or a comma', () => {
    expect(parsePrice('20')).toBe(20);
    expect(parsePrice(' 12,5 ')).toBe(12.5);
    expect(parsePrice('7.25')).toBe(7.25);
  });

  it('everything else is "no price"', () => {
    for (const text of ['', ' ', 'abc', '0', '0,00', '-5', '1e3', '12.345', '1 000', '12грн']) {
      expect(parsePrice(text)).toBeNull();
    }
  });
});
