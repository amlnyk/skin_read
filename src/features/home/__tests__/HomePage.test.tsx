import { act, cleanup, fireEvent, screen } from '@testing-library/react';
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

describe('the "Сьогодні" screen', () => {
  it('without a profile: invites to the test', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: t('nav.home') })).toBeInTheDocument();
    expect(screen.getByText(t('home.welcome'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.startTest') })).toHaveAttribute(
      'href',
      '/test',
    );
  });

  it('with a profile but no routine: a way to build it and the calendar', async () => {
    renderApp('/', { persona: PERSONAS.T1, now: APP_NOW });
    expect(await screen.findByText(t('home.careEmpty'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.careBuild') })).toHaveAttribute(
      'href',
      '/care',
    );
    expect(screen.getByRole('link', { name: t('home.calendarLink') })).toHaveAttribute(
      'href',
      '/journal',
    );
  });

  it('with a routine: both slots as checklists, nothing saved before "Зберегти"', async () => {
    const { store } = withRoutine(PERSONAS.T1);
    expect(await screen.findByRole('heading', { name: t('home.careTitleAm') })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('home.careTitlePm') })).toBeInTheDocument();

    const box = screen.getAllByRole('checkbox', { name: t('category.cleanser') })[0];
    if (!box) throw new Error('a cleanser step is expected');
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(store.getState().routineLog).toEqual([]);

    fireEvent.click(screen.getByRole('radio', { name: t('journal.feelingOption.good') }));
    fireEvent.click(screen.getByRole('button', { name: t('home.save') }));

    expect(screen.getByRole('status')).toHaveTextContent(t('home.saved'));
    const day = localDay(APP_NOW);
    const first = slotAt(APP_NOW);
    const entry = store.getState().routineLog.find((item) => item.slot === first);
    expect(entry?.date).toBe(day);
    expect(entry?.doneStepIds).toHaveLength(1);
    const journal = store.getState().journal;
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ date: day, feeling: 'good' });
  });

  it('alarming answers (T5a): the doctor banner comes first', async () => {
    renderApp('/', { persona: PERSONAS.T5a, now: APP_NOW });
    expect(await screen.findByRole('alert')).toHaveTextContent(t('profile.doctorBannerTitle'));
  });

  it('gives no score and no percent', async () => {
    withRoutine(PERSONAS.T2);
    await screen.findByRole('button', { name: t('home.save') });
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
