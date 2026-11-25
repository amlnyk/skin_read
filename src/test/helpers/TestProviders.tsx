import type { ReactNode } from 'react';
import { ServicesProvider, type Services } from '@/lib/services';
import { StoreProvider, type AppStore } from '@/store';
import { createTestServices, createTestStore } from './fakes';

type Props = {
  children: ReactNode;
  services?: Services;
  store?: AppStore;
};

// Wraps a component in the same providers the real app has, filled with fakes.
export function TestProviders({ children, services, store }: Props) {
  return (
    <ServicesProvider services={services ?? createTestServices()}>
      <StoreProvider store={store ?? createTestStore()}>{children}</StoreProvider>
    </ServicesProvider>
  );
}
