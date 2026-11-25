import type {
  CareSetup,
  JournalEntry,
  PersistedState,
  Product,
  Routine,
  RoutineLog,
  ScanResult,
  Settings,
  ShoppingNeed,
  SkinProfile,
  TestDraft,
} from '@/schemas';

/** Where the data lives right now. Not saved: it describes the current session. */
export type PersistenceStatus =
  | { readonly kind: 'ok' }
  // localStorage is unavailable or full: the app works in memory only
  | { readonly kind: 'memory_only'; readonly reason: 'unavailable' | 'quota' | 'unknown' }
  // saved data could not be read: it is kept untouched until the user decides
  | { readonly kind: 'corrupt'; readonly rawCopy: string };

export type Collection<T extends { id: string }> = {
  set(items: T[]): void;
  add(item: T): void;
  update(id: string, patch: Partial<Omit<T, 'id'>>): void;
  remove(id: string): void;
};

export type AppActions = {
  onboarding: { set(patch: Partial<PersistedState['onboarding']>): void; complete(): void };
  testDraft: {
    set(draft: TestDraft): void;
    update(patch: Partial<TestDraft>): void;
    clear(): void;
  };
  profile: {
    set(profile: SkinProfile): void;
    update(patch: Partial<SkinProfile>): void;
    remove(): void;
  };
  careSetup: { set(setup: CareSetup): void; update(patch: Partial<CareSetup>): void };
  routine: Collection<Routine>;
  routineLog: {
    set(entries: RoutineLog[]): void;
    /** Adds the entry or replaces the one with the same date and slot. */
    upsert(entry: RoutineLog): void;
    remove(date: string, slot: RoutineLog['slot']): void;
  };
  products: Collection<Product>;
  scans: Collection<ScanResult>;
  journal: Collection<JournalEntry>;
  needs: Collection<ShoppingNeed> & {
    /** Adds the item or replaces the one with the same id. */
    upsert(item: ShoppingNeed): void;
  };
  settings: { set(settings: Settings): void; update(patch: Partial<Settings>): void };
  /** Puts every slice back to its initial value. */
  resetAll(): void;
  /**
   * Replaces every saved slice at once (import of a file, deleting a category of data).
   * One change, so a half-replaced state is never saved. The data must already be valid.
   */
  replaceAll(data: PersistedState): void;
  /** After "data is corrupted": throws away the unreadable saved data and starts clean. */
  discardCorruptedData(): void;
};

export type AppState = PersistedState & {
  persistence: PersistenceStatus;
  actions: AppActions;
};
