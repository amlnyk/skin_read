import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { PERSONAS } from '@/test/personas';
import { productOf, renderApp } from '@/test/appHarness';

// Stage 14, attacks A.6 no. 9 to 11 on the screens that show what a person typed about a product.
// Expected: everything is shown as text; nothing runs; nothing becomes a link.

afterEach(cleanup);

const NAME = '<img src=x onerror=alert(1)>';
const BRAND = 'javascript:alert(1)';
const COMPOSITION = 'Aqua, Glycerin, Panthenol, <script>alert(1)</script>, Squalane';

const evil = productOf('p-evil', NAME, COMPOSITION, { brand: BRAND });
const plain = productOf('p-plain', 'Plain Cream', 'Aqua, Glycerin, Squalane');

function expectNothingInjected() {
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('img')).toBeNull();
  for (const link of Array.from(document.querySelectorAll('a'))) {
    expect(link.getAttribute('href') ?? '').not.toMatch(/^\s*javascript:/i);
  }
}

describe('attacks through the text of a product (A.6: 9, 10, 11)', () => {
  it('the collection shows the name and the brand as text, and the brand is not a link', async () => {
    renderApp('/care/products', { products: [evil] });
    expect(await screen.findByText(NAME)).toBeInTheDocument();
    const brand = screen.getByText(BRAND);
    expect(brand.closest('a')).toBeNull();
    expectNothingInjected();
  });

  it('the product card shows them as text too', async () => {
    renderApp('/care/products/p-evil', { products: [evil] });
    expect(await screen.findByRole('heading', { name: NAME })).toBeInTheDocument();
    expect(screen.getByText(BRAND).closest('a')).toBeNull();
    expectNothingInjected();
  });

  it('the compare screen shows the name as text', async () => {
    renderApp('/care/compare', { persona: PERSONAS.T2, products: [evil, plain] });
    await screen.findByRole('heading', { name: t('compare.title') });
    fireEvent.change(screen.getByLabelText(t('compare.firstLabel')), {
      target: { value: 'p:p-evil' },
    });
    fireEvent.change(screen.getByLabelText(t('compare.secondLabel')), {
      target: { value: 'p:p-plain' },
    });
    expect((await screen.findAllByText(NAME)).length).toBeGreaterThan(0);
    expectNothingInjected();
  });

  it('a pasted composition with markup stays text in the review and is never run', async () => {
    renderApp('/scan/paste', { persona: PERSONAS.T2 });
    fireEvent.change(await screen.findByLabelText(t('scan.pasteLabel')), {
      target: { value: COMPOSITION },
    });
    fireEvent.click(screen.getByRole('button', { name: t('scan.parse') }));
    expect(await screen.findByRole('heading', { name: t('scan.reviewTitle') })).toBeInTheDocument();
    expect((await screen.findAllByText(/script/)).length).toBeGreaterThan(0);
    expectNothingInjected();
  });
});
