import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t, type MessageKey } from '@/i18n';
import { TestProviders } from '@/test/TestProviders';
import { createTestStore } from '@/test/fakes';
import { appRoutes } from './router';

function renderAt(path: string, completed = true) {
  const store = createTestStore();
  if (completed) store.getState().actions.onboarding.complete();
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <TestProviders store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { router, store };
}

describe('app routes', () => {
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

  it('onboarding stub can be skipped, leads home and remembers it in the store', async () => {
    const { router, store } = renderAt('/', false);
    fireEvent.click(await screen.findByRole('button', { name: t('onboarding.skip') }));
    expect(await screen.findByRole('heading', { name: t('nav.home') })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(store.getState().onboarding.completed).toBe(true);
  });

  it('the developer state screen exists in the dev build (tests run as dev)', async () => {
    renderAt('/dev/state');
    expect(await screen.findByRole('heading', { name: t('dev.stateTitle') })).toBeInTheDocument();
  });
});
