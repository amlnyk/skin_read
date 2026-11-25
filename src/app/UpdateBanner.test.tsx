import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';
import { createUpdateNotifier } from '@/lib/pwa';
import { UpdateBanner } from './UpdateBanner';

describe('UpdateBanner', () => {
  it('shows nothing while there is no new version', () => {
    render(<UpdateBanner updates={createUpdateNotifier()} />);
    expect(screen.queryByText(t('update.available'))).not.toBeInTheDocument();
  });

  it('shows the message when a new version is ready and updates on request', () => {
    const updates = createUpdateNotifier();
    const apply = vi.fn();
    render(<UpdateBanner updates={updates} />);
    act(() => updates.markReady(apply));
    expect(screen.getByRole('status')).toHaveTextContent(t('update.available'));
    fireEvent.click(screen.getByRole('button', { name: t('update.apply') }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('update.available'))).not.toBeInTheDocument();
  });

  it('"later" hides the message and does not update', () => {
    const updates = createUpdateNotifier();
    const apply = vi.fn();
    render(<UpdateBanner updates={updates} />);
    act(() => updates.markReady(apply));
    fireEvent.click(screen.getByRole('button', { name: t('update.later') }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByText(t('update.available'))).not.toBeInTheDocument();
  });
});
