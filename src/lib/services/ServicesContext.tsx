import { createContext, useContext, type ReactNode } from 'react';
import type { Clock, IdGenerator, Logger, StorageAdapter } from '../ports';

// Everything that touches the outside world, in one object.
// Built in app/compositionRoot.ts, replaced by fakes in tests.
export type Services = {
  readonly storage: StorageAdapter;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
};

const ServicesContext = createContext<Services | null>(null);

type ProviderProps = { services: Services; children: ReactNode };

export function ServicesProvider({ services, children }: ProviderProps) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used inside <ServicesProvider>');
  }
  return services;
}
