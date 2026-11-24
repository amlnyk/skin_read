import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { useOnboardingStore } from '@/store';
import { appRoutes } from '../router';

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('OnboardingGuard', () => {
  afterEach(() => {
    useOnboardingStore.setState({ completed: true });
  });

  it('lets the user in when onboarding is completed', async () => {
    useOnboardingStore.setState({ completed: true });
    renderAt('/');
    expect(await screen.findByRole('heading', { name: t('nav.home') })).toBeInTheDocument();
  });

  it('redirects to /onboarding when onboarding is not completed', async () => {
    useOnboardingStore.setState({ completed: false });
    const router = renderAt('/care');
    expect(await screen.findByRole('heading', { name: t('onboarding.title') })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');
  });
});
