import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { attachProduct, buildBaseRoutine } from '@/logic/routine';
import { buildProfile } from '@/logic/profile';
import { APP_NOW, appBundle, productOf, renderApp } from '@/test/helpers/appHarness';
import { PERSONAS } from '@/test/data/personas';
import type { Product, Routine } from '@/types';

afterEach(cleanup);

// Persona T7 (plan, section 5): (1) a cleanser without actives, morning and evening; (2) an AHA
// toner, evening; (3) a retinoid serum, evening; (4) a moisturizer with Parfum, morning and
// evening. There is no sunscreen. The products are made of the invented fixture content.
const BASE = 'Aqua, Glycerin, Panthenol, Allantoin, Squalane';
const cleanser = productOf('p-cleanser', 'Cleanser', BASE, { category: 'cleanser' });
const toner = productOf(
  'p-toner',
  'Toner',
  'Aqua, Glycerin, Glycolic Acid, Lactic Acid, Panthenol',
  {
    category: 'toner_essence',
  },
);
const serum = productOf('p-serum', 'Serum', 'Aqua, Glycerin, Retinol, Squalane, Tocopherol', {
  category: 'serum',
});
const cream = productOf('p-cream', 'Cream', 'Aqua, Glycerin, Parfum, Squalane, Ceramide NP', {
  category: 'moisturizer',
});
const ALL = [cleanser, toner, serum, cream];

/** The base routine of persona T7 with products attached the way the screens attach them. */
function routinesFor(placement: { am?: Product[]; pm?: Product[] }): Routine[] {
  const bundle = appBundle();
  const { profile, analysis } = buildProfile(PERSONAS.T7, bundle, APP_NOW, {
    id: 'profile-1',
    revision: 1,
    createdAt: '2026-01-01T12:00:00.000Z',
  });
  return buildBaseRoutine(profile, analysis, [], bundle).routines.map((routine) =>
    (placement[routine.slot] ?? []).reduce(
      (current, item, index) =>
        attachProduct(current, item, `added-${routine.slot}-${index}`, 'daily'),
      routine,
    ),
  );
}

const T7_ROUTINES = routinesFor({ am: [cleanser, cream], pm: [cleanser, toner, serum, cream] });
const cardTitles = () =>
  screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));

describe('the analysis screen: empty states', () => {
  it('no products in the routine: an invitation, not an error', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, routines: routinesFor({}) });
    expect(await screen.findByRole('heading', { name: t('analysis.title') })).toBeInTheDocument();
    expect(screen.getByText(t('analysis.emptyText'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('analysis.emptyAdd') })).toHaveAttribute(
      'href',
      '/care/products/new',
    );
    expect(screen.queryAllByRole('article')).toEqual([]);
  });

  it('products in the collection but none in the routine: the same invitation', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, products: ALL, routines: routinesFor({}) });
    expect(await screen.findByText(t('analysis.emptyText'))).toBeInTheDocument();
  });

  it('no routine at all: the same invitation', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7 });
    expect(await screen.findByText(t('analysis.emptyText'))).toBeInTheDocument();
  });

  it('without a profile: asks to take the test', async () => {
    renderApp('/care/analysis');
    expect(await screen.findByText(t('analysis.needsProfile'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('analysis.startTest') })).toHaveAttribute(
      'href',
      '/test',
    );
  });
});

describe('the analysis screen: persona T7', () => {
  it('shows the observations in the order of the plan, each with its explanation', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, products: ALL, routines: T7_ROUTINES });
    await screen.findAllByRole('article');
    expect(cardTitles()).toEqual([
      t('analysis.kind.conflict'),
      t('analysis.kind.many_actives_in_slot'),
      t('analysis.kind.missing_base_step'),
      t('analysis.kind.preference_mismatch'),
    ]);
    // every card says why: the conflict from the rule, the other texts from the content or the profile
    expect(screen.getAllByText(new RegExp(`${t('analysis.whyLabel')}:`))).toHaveLength(4);
  });

  it('the conflict is raised by the sensitive skin and explained by the rule', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, products: ALL, routines: T7_ROUTINES });
    const [conflict] = await screen.findAllByRole('article');
    expect(conflict).toHaveTextContent(t('analysis.severity.important'));
    expect(conflict).toHaveTextContent(t('analysis.slotPm'));
    expect(conflict).toHaveTextContent(/Test caution explanation/);
    expect(conflict).toHaveTextContent(
      t('analysis.escalationLine', { list: '' }).trim().replace(/:$/, ''),
    );
    expect(conflict).toHaveTextContent(t('analysis.ruleSource', { source: 'test fixture' }));
  });

  it('the words of the spec come from the content (drafts), the missing ones say "being prepared"', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, products: ALL, routines: T7_ROUTINES });
    await screen.findAllByRole('article');
    expect(
      screen.getByText('У твоїй ранковій рутині не зазначено сонцезахисний засіб.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('У твоїй рутині є декілька засобів із відлущувальними компонентами.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Одночасне використання може підвищувати ризик подразнення, особливо з урахуванням зазначеної чутливості шкіри\./,
      ),
    ).toBeInTheDocument();
    // the sunscreen has a text but no "why": that is for the cosmetologist, nothing is invented
    const missing = screen.getAllByRole('article')[2];
    expect(missing).toHaveTextContent(t('common.contentPending'));
  });

  it('the cards link to the products they are about', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, products: ALL, routines: T7_ROUTINES });
    const [conflict, , , preference] = await screen.findAllByRole('article');
    const hrefs = (card: HTMLElement | undefined) =>
      Array.from(card?.querySelectorAll('a') ?? []).map((link) => link.getAttribute('href'));
    expect(hrefs(conflict)).toEqual(['/care/products/p-toner', '/care/products/p-serum']);
    expect(hrefs(preference)).toEqual(['/care/products/p-cream']);
  });

  it('has no numbers, no grade and no verdicts: only words', async () => {
    renderApp('/care/analysis', { persona: PERSONAS.T7, products: ALL, routines: T7_ROUTINES });
    await screen.findAllByRole('article');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/%|оцінк|(^|\s)бал(и|ів|ом)?(\s|[.,]|$)|\d+\s*\/\s*\d+/i);
    expect(text).not.toMatch(/безпечн|заборон/i);
    expect(screen.getByRole('note', { name: t('disclaimer.label') })).toBeInTheDocument();
  });

  it('removing a product from the routine removes its observations', async () => {
    const { store } = renderApp('/care/analysis', {
      persona: PERSONAS.T7,
      products: ALL,
      routines: T7_ROUTINES,
    });
    await screen.findAllByRole('article');
    const evening = store.getState().routine.find((routine) => routine.slot === 'pm');
    act(() => {
      store.getState().actions.routine.update('routine-pm', {
        steps: (evening?.steps ?? []).filter((step) => step.productId !== 'p-serum'),
      });
    });
    await waitFor(() =>
      expect(cardTitles()).toEqual([
        t('analysis.kind.missing_base_step'),
        t('analysis.kind.preference_mismatch'),
      ]),
    );
  });

  it('removing a product from the collection removes its observations too', async () => {
    const { store } = renderApp('/care/analysis', {
      persona: PERSONAS.T7,
      products: ALL,
      routines: T7_ROUTINES,
    });
    await screen.findAllByRole('article');
    act(() => store.getState().actions.products.remove('p-cream'));
    await waitFor(() => expect(cardTitles()).not.toContain(t('analysis.kind.preference_mismatch')));
    expect(cardTitles()).toContain(t('analysis.kind.conflict'));
  });
});

describe('the analysis screen: only some of the products', () => {
  it('shows the missing steps without asking for a full set', async () => {
    renderApp('/care/analysis', {
      persona: PERSONAS.T1,
      products: [cleanser],
      routines: routinesFor({ pm: [cleanser] }),
    });
    await screen.findAllByRole('article');
    expect(cardTitles()).toEqual([
      t('analysis.kind.missing_base_step'),
      t('analysis.kind.missing_base_step'),
    ]);
    expect(screen.queryByText(t('analysis.emptyText'))).not.toBeInTheDocument();
  });

  it('a routine with nothing to remark on says so, and that it is not a guarantee', async () => {
    const complete = productOf('p-spf', 'Sun', BASE, { category: 'sunscreen' });
    renderApp('/care/analysis', {
      persona: PERSONAS.T1,
      products: [
        cleanser,
        complete,
        productOf('p-moist', 'Moist', BASE, { category: 'moisturizer' }),
      ],
      routines: routinesFor({
        am: [complete, productOf('p-moist', 'Moist', BASE, { category: 'moisturizer' })],
        pm: [cleanser, productOf('p-moist', 'Moist', BASE, { category: 'moisturizer' })],
      }),
    });
    expect(await screen.findByText(t('analysis.noneFound'))).toBeInTheDocument();
  });
});

describe('the way to the analysis', () => {
  it('"Мій догляд" has a link to it', async () => {
    renderApp('/care', { persona: PERSONAS.T7, products: ALL, routines: T7_ROUTINES });
    expect(await screen.findByRole('link', { name: t('care.analysisLink') })).toHaveAttribute(
      'href',
      '/care/analysis',
    );
  });
});
