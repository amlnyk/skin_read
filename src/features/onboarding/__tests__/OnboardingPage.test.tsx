import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { TestProviders } from '@/test/helpers/TestProviders';
import { createTestStore } from '@/test/helpers/fakes';
import { OnboardingPage } from '../pages/OnboardingPage';

function setup() {
  const store = createTestStore();
  const router = createMemoryRouter(
    [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/test', element: <p>test screen</p> },
    ],
    { initialEntries: ['/onboarding'] },
  );
  render(
    <TestProviders store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { store, router };
}

// The first step says "Розпочати" (Figma Welcome), the others "Далі".
const next = () =>
  fireEvent.click(
    screen.queryByRole('button', { name: t('onboarding.begin') }) ??
      screen.getByRole('button', { name: t('onboarding.next') }),
  );

describe('OnboardingPage', () => {
  it('starts with the welcome step and no "Back"', () => {
    setup();
    expect(screen.getByRole('heading', { name: t('onboarding.welcomeTitle') })).toBeInTheDocument();
    expect(
      screen.getByText(t('onboarding.stepLabel', { current: 1, total: 3 })),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('onboarding.back') })).not.toBeInTheDocument();
  });

  it('shows what the app can do on the second step', () => {
    setup();
    next();
    expect(
      screen.getByRole('heading', { name: t('onboarding.featuresTitle') }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('the last step has the medical disclaimer, the storage note and the start button', () => {
    setup();
    next();
    next();
    expect(screen.getByRole('heading', { name: t('onboarding.limitsTitle') })).toBeInTheDocument();
    expect(screen.getByRole('note', { name: t('disclaimer.label') })).toBeInTheDocument();
    expect(screen.getByText(t('onboarding.limitsData'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('onboarding.next') })).not.toBeInTheDocument();
  });

  it('"Back" returns to the previous step', () => {
    setup();
    next();
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.back') }));
    expect(screen.getByRole('heading', { name: t('onboarding.welcomeTitle') })).toBeInTheDocument();
  });

  it('"Start without registration" saves the flag and opens the test', () => {
    const { store, router } = setup();
    expect(store.getState().onboarding.completed).toBe(false);
    next();
    next();
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.start') }));
    expect(store.getState().onboarding.completed).toBe(true);
    expect(router.state.location.pathname).toBe('/test');
  });
});
