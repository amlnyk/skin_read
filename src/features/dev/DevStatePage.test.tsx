import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { persistedStateSchema } from '@/schemas';
import { STORAGE_KEY } from '@/store';
import { TestProviders } from '@/test/TestProviders';
import { createMemoryAdapter, createTestStore } from '@/test/fakes';
import { createExampleData } from './exampleData';
import { DevStatePage } from './pages/DevStatePage';

describe('example data', () => {
  it('passes the same schema as data restored from storage', () => {
    const base = createTestStore(createMemoryAdapter()).getState();
    const example = createExampleData(base, '2026-01-01T10:00:00.000Z');
    expect(persistedStateSchema.safeParse(example).success).toBe(true);
  });
});

describe('DevStatePage', () => {
  function setup() {
    const adapter = createMemoryAdapter();
    const store = createTestStore(adapter);
    render(
      <TestProviders store={store}>
        <DevStatePage />
      </TestProviders>,
    );
    return { adapter, store };
  }

  it('shows the state and the persistence status', () => {
    setup();
    expect(screen.getByRole('heading', { name: t('dev.stateTitle') })).toBeInTheDocument();
    expect(screen.getByText(/ok$/)).toBeInTheDocument();
  });

  it('"write example" fills the store and the storage, "reset" clears them', () => {
    const { adapter, store } = setup();
    fireEvent.click(screen.getByRole('button', { name: t('dev.writeExample') }));
    expect(store.getState().products).toHaveLength(1);
    const saved = adapter.getItem(STORAGE_KEY);
    expect(saved.ok && saved.value).toContain('example-product');

    fireEvent.click(screen.getByRole('button', { name: t('dev.reset') }));
    expect(store.getState().products).toEqual([]);
    expect(store.getState().onboarding.completed).toBe(false);
  });

  it('the shown JSON does not contain the actions', () => {
    setup();
    expect(document.querySelector('pre')?.textContent).not.toContain('actions');
  });
});
