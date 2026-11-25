import { createContext, useContext, type ReactNode } from 'react';
import type {
  Clock,
  ContentProvider,
  IdGenerator,
  LabelReader,
  Logger,
  PhotoStore,
  StorageAdapter,
} from '../ports';
import type { ImageDeps } from '../image';

// Everything that touches the outside world, in one object.
// Built in app/compositionRoot.ts, replaced by fakes in tests.
export type Services = {
  readonly storage: StorageAdapter;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  /** Content after CONTENT_POLICY is applied. */
  readonly content: ContentProvider;
  /** Photo of a label -> text of the composition (needs the server function). */
  readonly labelReader: LabelReader;
  /** How a picked photo is opened and shrunk (the browser's canvas; a fake in tests). */
  readonly imageDeps: ImageDeps;
  /** Photos the user chose to keep on this device. */
  readonly photos: PhotoStore;
  /** Switches that come from the build settings (VITE_FEATURE_*). */
  readonly features: { readonly photoScan: boolean };
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
