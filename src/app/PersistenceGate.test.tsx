import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';
import { downloadTextFile } from '@/lib/download';
import { STORAGE_KEY } from '@/store';
import { TestProviders } from '@/test/TestProviders';
import {
  createMemoryAdapter,
  createTestStore,
  createUnavailableAdapter,
  createWriteFailingAdapter,
} from '@/test/fakes';
import { PersistenceGate } from './PersistenceGate';

vi.mock('@/lib/download', () => ({ downloadTextFile: vi.fn() }));

const CHILD = 'app content';

function renderGate(store: ReturnType<typeof createTestStore>) {
  render(
    <TestProviders store={store}>
      <PersistenceGate>
        <p>{CHILD}</p>
      </PersistenceGate>
    </TestProviders>,
  );
}

describe('PersistenceGate', () => {
  beforeEach(() => {
    vi.mocked(downloadTextFile).mockClear();
  });

  it('healthy storage: shows the app and no banner', () => {
    renderGate(createTestStore());
    expect(screen.getByText(CHILD)).toBeInTheDocument();
    expect(screen.queryByText(t('persistence.memoryOnly'))).not.toBeInTheDocument();
  });

  it('unavailable storage: the app is shown with a banner, not a white screen', () => {
    renderGate(createTestStore(createUnavailableAdapter()));
    expect(screen.getByText(CHILD)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(t('persistence.memoryOnly'));
  });

  it('full storage: the banner appears after the first failed write', () => {
    const store = createTestStore(createWriteFailingAdapter('quota'));
    renderGate(store);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      store.getState().actions.onboarding.complete();
    });

    expect(screen.getByRole('status')).toHaveTextContent(t('persistence.memoryOnly'));
    expect(screen.getByText(CHILD)).toBeInTheDocument();
  });

  describe('corrupted data', () => {
    const RAW = '{not json';
    const setup = () => {
      const adapter = createMemoryAdapter({ [STORAGE_KEY]: RAW });
      const store = createTestStore(adapter);
      renderGate(store);
      return { adapter, store };
    };

    it('shows the "data is corrupted" screen instead of the app', () => {
      setup();
      expect(
        screen.getByRole('heading', { name: t('persistence.corruptedTitle') }),
      ).toBeInTheDocument();
      expect(screen.queryByText(CHILD)).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: t('persistence.downloadRaw') }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: t('persistence.reset') })).toBeInTheDocument();
    });

    it('downloads the raw data and keeps it in storage', () => {
      const { adapter } = setup();
      fireEvent.click(screen.getByRole('button', { name: t('persistence.downloadRaw') }));
      expect(downloadTextFile).toHaveBeenCalledTimes(1);
      const [filename, text] = vi.mocked(downloadTextFile).mock.calls[0] ?? [];
      expect(filename).toMatch(/^skinbarrier-raw-data-\d{4}-\d{2}-\d{2}\.txt$/);
      expect(text).toBe(RAW);
      expect(adapter.getItem(STORAGE_KEY)).toEqual({ ok: true, value: RAW });
    });

    it('reset asks for a second confirmation and can be cancelled', () => {
      const { adapter } = setup();
      fireEvent.click(screen.getByRole('button', { name: t('persistence.reset') }));
      expect(screen.getByText(t('persistence.resetConfirmText'))).toBeInTheDocument();
      expect(adapter.getItem(STORAGE_KEY)).toEqual({ ok: true, value: RAW });

      fireEvent.click(screen.getByRole('button', { name: t('persistence.resetCancel') }));
      expect(screen.queryByText(t('persistence.resetConfirmText'))).not.toBeInTheDocument();
      expect(adapter.getItem(STORAGE_KEY)).toEqual({ ok: true, value: RAW });
    });

    it('confirmed reset throws the data away and opens the app', () => {
      const { adapter } = setup();
      fireEvent.click(screen.getByRole('button', { name: t('persistence.reset') }));
      fireEvent.click(screen.getByRole('button', { name: t('persistence.resetConfirm') }));
      expect(screen.getByText(CHILD)).toBeInTheDocument();
      expect(adapter.getItem(STORAGE_KEY)).not.toEqual({ ok: true, value: RAW });
    });
  });
});
