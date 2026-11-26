import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';
import { TestProviders } from '@/test/helpers/TestProviders';
import { createTestStore } from '@/test/helpers/fakes';
import { LoginPage } from '../pages/LoginPage';

function setup() {
  const store = createTestStore();
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/onboarding', element: <p>onboarding</p> },
      { path: '/test', element: <p>test screen</p> },
      { path: '/', element: <p>home</p> },
    ],
    { initialEntries: ['/login'] },
  );
  render(
    <TestProviders store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { store, router };
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('LoginPage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows hints and stays on the screen when the form is wrong', () => {
    const { store, router } = setup();
    type(t('login.email'), 'anna');
    type(t('login.password'), '123');
    fireEvent.click(screen.getByRole('button', { name: t('login.submit') }));
    expect(screen.getByText(t('login.emailError'))).toBeInTheDocument();
    expect(screen.getByText(t('login.passwordError'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(store.getState().onboarding.accountEmail).toBeUndefined();
  });

  it('signs in: keeps the email, never the password, and opens the test', () => {
    const { store, router } = setup();
    type(t('login.email'), 'anna@example.com');
    type(t('login.password'), 'secret1');
    fireEvent.click(screen.getByRole('button', { name: t('login.submit') }));
    expect(screen.getByRole('button', { name: t('login.busy') })).toBeDisabled();
    act(() => {
      vi.runAllTimers();
    });
    const saved = store.getState().onboarding;
    expect(saved).toEqual({ completed: true, accountEmail: 'anna@example.com' });
    expect(JSON.stringify(saved)).not.toContain('secret1');
    expect(router.state.location.pathname).toBe('/test');
  });

  it('"Back" returns to onboarding', () => {
    const { router } = setup();
    fireEvent.click(screen.getByRole('button', { name: t('onboarding.back') }));
    expect(router.state.location.pathname).toBe('/onboarding');
  });
});
