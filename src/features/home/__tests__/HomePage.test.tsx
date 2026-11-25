import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { analyzeSavedProfile } from '@/logic/profile';
import { buildBaseRoutine } from '@/logic/routine';
import { APP_NOW, renderApp } from '@/test/helpers/appHarness';
import { PERSONAS } from '@/test/data/personas';
import { localDay, slotAt } from '../hooks/useHomeSummary';

afterEach(cleanup);

function withRoutine(persona: (typeof PERSONAS)[keyof typeof PERSONAS]) {
  const rendered = renderApp('/', { persona, now: APP_NOW });
  const { store, bundle } = rendered;
  const profile = store.getState().profile;
  if (!profile) throw new Error('the persona must give a profile');
  const analysis = analyzeSavedProfile(profile, {}, bundle, APP_NOW);
  act(() =>
    store.getState().actions.routine.set(buildBaseRoutine(profile, analysis, [], bundle).routines),
  );
  return rendered;
}

describe('the home screen', () => {
  it('without a profile: invites to the test, links to the scanner, shows the disclaimer', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: t('nav.home') })).toBeInTheDocument();
    expect(screen.getByText(t('home.welcome'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.startTest') })).toHaveAttribute(
      'href',
      '/test',
    );
    expect(screen.getByRole('link', { name: t('home.quickScan') })).toHaveAttribute(
      'href',
      '/scan',
    );
    expect(screen.getByRole('note', { name: t('disclaimer.label') })).toBeInTheDocument();
    expect(screen.queryByText(t('common.inDevelopment'))).not.toBeInTheDocument();
  });

  it('with a profile but no routine: the profile summary and a way to build the routine', async () => {
    renderApp('/', { persona: PERSONAS.T1, now: APP_NOW });
    expect(
      await screen.findByRole('heading', { name: t('home.profileTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.profileLink') })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.getByText(t('home.careEmpty'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.careBuild') })).toHaveAttribute(
      'href',
      '/care',
    );
    expect(screen.getByRole('link', { name: t('home.quickJournal') })).toHaveAttribute(
      'href',
      '/profile/journal',
    );
  });

  it('with a routine: the steps of now, the marks of today and what is missing', async () => {
    withRoutine(PERSONAS.T1);
    const title = slotAt(APP_NOW) === 'am' ? t('home.careTitleAm') : t('home.careTitlePm');
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    const steps: ('cleanser' | 'moisturizer' | 'sunscreen')[] =
      slotAt(APP_NOW) === 'am'
        ? ['cleanser', 'moisturizer', 'sunscreen']
        : ['cleanser', 'moisturizer'];
    const names = steps.map((category) => t(`category.${category}`)).join(', ');
    expect(screen.getByText(t('home.careSteps', { names }))).toBeInTheDocument();
    expect(
      screen.getByText(t('home.careDone', { done: 0, total: slotAt(APP_NOW) === 'am' ? 3 : 2 })),
    ).toBeInTheDocument();
    // nothing is owned, so the base steps are needs
    expect(screen.getByRole('heading', { name: t('home.needsTitle') })).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`^${t('home.needsList', { names: '' })}`)),
    ).toBeInTheDocument();
    expect(screen.queryByText(t('home.needsNone'))).not.toBeInTheDocument();
  });

  it('alarming answers (T5a): the doctor banner comes first', async () => {
    renderApp('/', { persona: PERSONAS.T5a, now: APP_NOW });
    expect(await screen.findByRole('alert')).toHaveTextContent(t('profile.doctorBannerTitle'));
  });

  it('gives no score and no percent', async () => {
    withRoutine(PERSONAS.T2);
    await screen.findByRole('heading', { name: t('home.profileTitle') });
    expect(document.body.textContent ?? '').not.toMatch(/%|\d+\s*\/\s*10|бал/);
  });
});

describe('helpers', () => {
  it('morning until 15:00 local time', () => {
    const at = (hour: number) => new Date(2026, 0, 5, hour).getTime();
    expect(slotAt(at(7))).toBe('am');
    expect(slotAt(at(14))).toBe('am');
    expect(slotAt(at(15))).toBe('pm');
    expect(slotAt(at(23))).toBe('pm');
  });

  it('the local day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 30).getTime())).toBe('2026-01-05');
  });
});
