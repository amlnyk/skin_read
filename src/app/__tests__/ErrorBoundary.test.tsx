import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';
import { ErrorBoundary } from '../components/ErrorBoundary';

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <p>recovered</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs caught render errors to console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a friendly alert instead of crashing', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(t('errors.title'));
  });

  it('retry button renders the children again', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: t('errors.retry') }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('renders children when nothing fails', () => {
    shouldThrow = false;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
});
