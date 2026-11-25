import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t, type MessageKey } from '@/i18n';
import { TestProviders } from '@/test/TestProviders';
import { createRealContent, createTestServices, createTestStore } from '@/test/fakes';
import { appRoutes } from './router';

function renderAt(path: string, completed = true) {
  const store = createTestStore();
  if (completed) store.getState().actions.onboarding.complete();
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <TestProviders store={store} services={createTestServices({ content: createRealContent() })}>
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
    ['/reference/compat', 'compat.title'], // lazy chunk
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

  it('onboarding leads through three steps to the test and is remembered in the store', async () => {
    const { router, store } = renderAt('/', false);
    expect(
      await screen.findByRole('heading', { name: t('onboarding.welcomeTitle') }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.next') }));
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.next') }));
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.start') }));
    expect(
      await screen.findByRole('heading', { name: 'Визнач свій тип шкіри' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/test');
    expect(store.getState().onboarding.completed).toBe(true);
  });

  it('the home page links to the test', async () => {
    renderAt('/');
    fireEvent.click(await screen.findByRole('link', { name: t('home.startTest') }));
    expect(
      await screen.findByRole('heading', { name: 'Визнач свій тип шкіри' }),
    ).toBeInTheDocument();
  });

  it('the developer state screen exists in the dev build (tests run as dev)', async () => {
    renderAt('/dev/state');
    expect(await screen.findByRole('heading', { name: t('dev.stateTitle') })).toBeInTheDocument();
  });
});
