import { describe, expect, it } from 'vitest';
import valid from '@fixtures/persisted-valid.json';
import valid1 from '@fixtures/persisted-v1.json';
import valid2 from '@fixtures/persisted-v2.json';
import type { Product } from '@/schemas';
import {
  createJsdomStorageAdapter,
  createMemoryAdapter,
  createUnavailableAdapter,
  createWriteFailingAdapter,
} from '@/test/fakes';
import { createAppStore, pickPersisted, STORAGE_KEY } from './createAppStore';

const envelope = (state: unknown, version = 3) => JSON.stringify({ state, version });

describe('persistence round trip', () => {
  it('starts with initial data and a healthy status', () => {
    const state = createAppStore(createMemoryAdapter()).getState();
    expect(state.onboarding.completed).toBe(false);
    expect(state.products).toEqual([]);
    expect(state.persistence).toEqual({ kind: 'ok' });
  });

  it('saves changes under the versioned key and restores them in a new store', () => {
    const adapter = createMemoryAdapter();
    createAppStore(adapter).getState().actions.onboarding.complete();

    const raw = adapter.getItem(STORAGE_KEY);
    expect(raw.ok && raw.value).toBeTruthy();
    const saved = JSON.parse(raw.ok && raw.value ? raw.value : '{}') as {
      version: number;
      state: Record<string, unknown>;
    };
    expect(saved.version).toBe(3);
    // actions and the session status are never saved
    expect(saved.state).not.toHaveProperty('actions');
    expect(saved.state).not.toHaveProperty('persistence');

    const restored = createAppStore(adapter).getState();
    expect(restored.onboarding.completed).toBe(true);
    expect(restored.persistence).toEqual({ kind: 'ok' });
  });

  it('restores a complete valid saved state', () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: envelope(valid) });
    const state = createAppStore(adapter).getState();
    expect(state.persistence).toEqual({ kind: 'ok' });
    expect(state.profile?.id).toBe('profile-1');
    expect(state.products).toHaveLength(1);
    expect(state.settings.reminders.pm).toEqual({ enabled: true, time: '21:30' });
  });

  it('migrates data saved with an older version (stub keeps the data)', () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: envelope(valid, 0) });
    const state = createAppStore(adapter).getState();
    expect(state.persistence).toEqual({ kind: 'ok' });
    expect(state.products).toHaveLength(1);
  });

  it('restores data saved by version 1 and brings it to the current shape', () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: envelope(valid1, 1) });
    const state = createAppStore(adapter).getState();
    expect(state.persistence).toEqual({ kind: 'ok' });
    expect(state.careSetup).toEqual({
      scenario: null,
      ownedCategories: [],
      builtForRevision: null,
    });
    expect(state.needs).toEqual([{ id: 'need-1', done: false, dismissed: false }]);
    expect(state.profile?.id).toBe('profile-1');
  });

  it('restores data saved by version 2 and keeps the products, the checks and the profile', () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: envelope(valid2, 2) });
    const state = createAppStore(adapter).getState();
    expect(state.persistence).toEqual({ kind: 'ok' });
    expect(state.profile?.revision).toBe(2);
    expect(state.profile?.reactionIngredients).toEqual([]);
    expect(state.products.map((product) => product.id)).toEqual(['product-1', 'product-2']);
    expect(state.products[1]?.ingredients[2]).toMatchObject({
      raw: 'Niacinamide',
      matchType: 'fuzzy',
      groupIds: [],
      confirmed: true,
    });
    expect(state.scans).toHaveLength(1);
    expect(state.scans[0]).toMatchObject({ id: 'scan-1', status: 'may_fit', profileRevision: 2 });
    expect(state.scans[0]?.warnings[0]).toMatchObject({
      kind: 'personal_restriction',
      key: null,
      possible: false,
    });
  });

  it('works with the real jsdom localStorage', () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const adapter = createJsdomStorageAdapter();
    createAppStore(adapter).getState().actions.onboarding.complete();
    expect(createAppStore(adapter).getState().onboarding.completed).toBe(true);
    window.localStorage.removeItem(STORAGE_KEY);
  });
});

describe('actions', () => {
  const product = valid.products[0] as unknown as Product;

  it('onboarding: set and complete', () => {
    const store = createAppStore(createMemoryAdapter());
    expect(store.getState().onboarding.completed).toBe(false);
    store.getState().actions.onboarding.set({ completed: true });
    expect(store.getState().onboarding.completed).toBe(true);
    store.getState().actions.onboarding.set({ completed: false });
    store.getState().actions.onboarding.complete();
    expect(store.getState().onboarding.completed).toBe(true);
  });

  it('collections: add, update, remove, set', () => {
    const store = createAppStore(createMemoryAdapter());
    const { actions } = store.getState();
    const first: Product = { ...product, id: 'p1' };
    const second: Product = { ...product, id: 'p2' };

    actions.products.add(first);
    actions.products.add(second);
    expect(store.getState().products.map((p) => p.id)).toEqual(['p1', 'p2']);

    actions.products.update('p1', { name: 'Renamed' });
    expect(store.getState().products[0]?.name).toBe('Renamed');
    expect(store.getState().products[1]?.name).toBe(product.name);

    actions.products.remove('p1');
    expect(store.getState().products.map((p) => p.id)).toEqual(['p2']);

    actions.products.set([]);
    expect(store.getState().products).toEqual([]);
  });

  it('routine log: upsert replaces the same date and slot, remove deletes it', () => {
    const store = createAppStore(createMemoryAdapter());
    const { actions } = store.getState();
    actions.routineLog.upsert({ date: '2026-01-01', slot: 'am', doneStepIds: ['a'] });
    actions.routineLog.upsert({ date: '2026-01-01', slot: 'pm', doneStepIds: [] });
    actions.routineLog.upsert({ date: '2026-01-01', slot: 'am', doneStepIds: ['a', 'b'] });
    expect(store.getState().routineLog).toHaveLength(2);
    expect(store.getState().routineLog.find((e) => e.slot === 'am')?.doneStepIds).toEqual([
      'a',
      'b',
    ]);
    actions.routineLog.remove('2026-01-01', 'am');
    expect(store.getState().routineLog.map((e) => e.slot)).toEqual(['pm']);
  });

  it('care setup: set and update', () => {
    const store = createAppStore(createMemoryAdapter());
    const { actions } = store.getState();
    actions.careSetup.set({
      scenario: 'partial',
      ownedCategories: ['moisturizer'],
      builtForRevision: 1,
    });
    actions.careSetup.update({ builtForRevision: 2 });
    expect(store.getState().careSetup).toEqual({
      scenario: 'partial',
      ownedCategories: ['moisturizer'],
      builtForRevision: 2,
    });
  });

  it('needs: upsert adds an item and replaces the one with the same id', () => {
    const store = createAppStore(createMemoryAdapter());
    const { actions } = store.getState();
    actions.needs.upsert({ id: 'need-cleanser', done: false, dismissed: false });
    actions.needs.upsert({ id: 'need-sunscreen', done: false, dismissed: false });
    actions.needs.upsert({ id: 'need-cleanser', done: true, dismissed: false });
    expect(store.getState().needs).toHaveLength(2);
    expect(store.getState().needs.find((need) => need.id === 'need-cleanser')?.done).toBe(true);
  });

  it('profile: update changes an existing profile and does nothing without one', () => {
    const store = createAppStore(createMemoryAdapter({ [STORAGE_KEY]: envelope(valid) }));
    store.getState().actions.profile.update({ revision: 2 });
    expect(store.getState().profile?.revision).toBe(2);
    store.getState().actions.profile.remove();
    expect(store.getState().profile).toBeNull();
    store.getState().actions.profile.update({ revision: 5 });
    expect(store.getState().profile).toBeNull();
  });

  it('test draft: set, update, clear', () => {
    const store = createAppStore(createMemoryAdapter());
    const { actions } = store.getState();
    actions.testDraft.update({ currentQuestionId: 'q5' });
    expect(store.getState().testDraft.currentQuestionId).toBe('q5');
    actions.testDraft.clear();
    expect(store.getState().testDraft.currentQuestionId).toBeNull();
  });

  it('settings: update merges, set replaces', () => {
    const store = createAppStore(createMemoryAdapter());
    const { actions } = store.getState();
    actions.settings.update({ showShavingField: true });
    expect(store.getState().settings.showShavingField).toBe(true);
    expect(store.getState().settings.cycleTrackingVisible).toBe(false);
  });

  it('resetAll puts every slice back to its initial value and saves it', () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: envelope(valid) });
    const store = createAppStore(adapter);
    expect(store.getState().products).toHaveLength(1);
    store.getState().actions.resetAll();
    expect(store.getState().products).toEqual([]);
    expect(store.getState().profile).toBeNull();
    expect(store.getState().onboarding.completed).toBe(false);
    expect(createAppStore(adapter).getState().products).toEqual([]);
  });

  it('replaceAll replaces every slice in one change and saves it', () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: envelope(valid) });
    const store = createAppStore(adapter);
    const before = pickPersisted(store.getState());
    const next = {
      ...before,
      products: [],
      journal: [],
      settings: { ...before.settings, showShavingField: true },
    };
    let changes = 0;
    const unsubscribe = store.subscribe(() => {
      changes += 1;
    });
    store.getState().actions.replaceAll(next);
    unsubscribe();

    expect(changes).toBe(1);
    expect(pickPersisted(store.getState())).toEqual(next);
    expect(store.getState().actions).toBeDefined();
    expect(pickPersisted(createAppStore(adapter).getState())).toEqual(next);
  });

  it('pickPersisted leaves out the actions and the session status', () => {
    const picked = pickPersisted(createAppStore(createMemoryAdapter()).getState());
    expect(Object.keys(picked).sort()).toEqual(
      [
        'careSetup',
        'journal',
        'needs',
        'onboarding',
        'products',
        'profile',
        'routine',
        'routineLog',
        'scans',
        'settings',
        'testDraft',
      ].sort(),
    );
  });

  it('the initial data of two resets does not share objects', () => {
    const store = createAppStore(createMemoryAdapter());
    store.getState().actions.resetAll();
    const first = store.getState().settings;
    store.getState().actions.resetAll();
    expect(store.getState().settings).not.toBe(first);
  });
});

describe('unavailable or full storage', () => {
  it('unavailable storage: the app works in memory and says so', () => {
    const store = createAppStore(createUnavailableAdapter());
    expect(store.getState().persistence).toEqual({ kind: 'memory_only', reason: 'unavailable' });
    store.getState().actions.onboarding.complete();
    expect(store.getState().onboarding.completed).toBe(true);
  });

  it('a full storage on write switches to memory only (quota)', () => {
    const store = createAppStore(createWriteFailingAdapter('quota'));
    expect(store.getState().persistence).toEqual({ kind: 'ok' });
    store.getState().actions.onboarding.complete();
    expect(store.getState().persistence).toEqual({ kind: 'memory_only', reason: 'quota' });
    expect(store.getState().onboarding.completed).toBe(true);
  });
});

describe('corrupted saved data', () => {
  const cases: [string, string][] = [
    ['not JSON at all', '{not json'],
    ['JSON that is not a saved state', '["a"]'],
    ['an envelope with an invalid state', envelope({ ...valid, onboarding: { completed: 'yes' } })],
    ['an envelope without a state', JSON.stringify({ version: 1 })],
  ];

  it.each(cases)('%s: marked corrupt, raw copy kept, nothing overwritten', (_name, raw) => {
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: raw });
    const store = createAppStore(adapter);

    expect(store.getState().persistence).toEqual({ kind: 'corrupt', rawCopy: raw });

    // The user (or the app) changes something: the saved data must stay as it was.
    store.getState().actions.onboarding.complete();
    store.getState().actions.products.set([]);
    expect(adapter.getItem(STORAGE_KEY)).toEqual({ ok: true, value: raw });
    expect(store.getState().persistence.kind).toBe('corrupt');
  });

  it('discardCorruptedData starts clean and saving works again', () => {
    const raw = '{not json';
    const adapter = createMemoryAdapter({ [STORAGE_KEY]: raw });
    const store = createAppStore(adapter);

    store.getState().actions.discardCorruptedData();
    expect(store.getState().persistence).toEqual({ kind: 'ok' });
    expect(store.getState().onboarding.completed).toBe(false);

    store.getState().actions.onboarding.complete();
    expect(createAppStore(adapter).getState().onboarding.completed).toBe(true);
  });
});
