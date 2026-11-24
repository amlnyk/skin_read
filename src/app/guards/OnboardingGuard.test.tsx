import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { TestProviders } from '@/test/TestProviders';
import { createTestStore } from '@/test/fakes';
import { appRoutes } from '../router';

function renderAt(path: string, completed: boolean) {
  const store = createTestStore();
  if (completed) store.getState().actions.onboarding.complete();
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <TestProviders store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return router;
}

describe('OnboardingGuard', () => {
  it('lets the user in when onboarding is completed', async () => {
    renderAt('/', true);
    expect(await screen.findByRole('heading', { name: t('nav.home') })).toBeInTheDocument();
  });

  it('redirects to /onboarding when onboarding is not completed', async () => {
    const router = renderAt('/care', false);
    expect(await screen.findByRole('heading', { name: t('onboarding.title') })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');
  });
});
