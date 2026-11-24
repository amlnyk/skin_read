import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { AppStore } from './createAppStore';
import type { AppState } from './types';

const StoreContext = createContext<AppStore | null>(null);

type ProviderProps = { store: AppStore; children: ReactNode };

export function StoreProvider({ store, children }: ProviderProps) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The store itself, for code that needs getState() (not for rendering). */
export function useAppStoreApi(): AppStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useAppStore must be used inside <StoreProvider>');
  }
  return store;
}

/** Reads a part of the state and re-renders when it changes. */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(useAppStoreApi(), selector);
}
