import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/store';
import { appRoutes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('app routes', () => {
  afterEach(() => {
    useOnboardingStore.setState({ completed: true });
  });

  const pages: [string, MessageKey][] = [
    ['/', 'nav.home'],
    ['/care', 'nav.care'],
    ['/scan', 'nav.scan'], // lazy chunk
    ['/reference', 'nav.reference'], // lazy chunk
    ['/profile', 'nav.profile'],
  ];

  it.each(pages)('opens %s', async (path, titleKey) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: t(titleKey) })).toBeInTheDocument();
  });

  it('shows the medical disclaimer on the home page', async () => {
    renderAt('/');
    expect(await screen.findByRole('note', { name: t('disclaimer.label') })).toBeInTheDocument();
  });

  it('onboarding stub can be skipped and leads to the home page', async () => {
    useOnboardingStore.setState({ completed: false });
    const router = renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: t('onboarding.skip') }));
    expect(await screen.findByRole('heading', { name: t('nav.home') })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
