import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { appRoutes } from '@/app/router';
import type { Services } from '@/lib/services';
import { prepareComposition } from '@/logic/analyze';
import { buildProfile } from '@/logic/profile';
import type {
  ContentBundle,
  JournalEntry,
  Product,
  Routine,
  ScanResult,
  Settings,
  SkinProfile,
  TestAnswers,
} from '@/types';
import {
  createFixedClock,
  createRealContent,
  createTestContent,
  createTestServices,
  createTestStore,
} from './fakes';
import { inciContent } from './inciFixtures';
import { TestProviders } from './TestProviders';

// The whole app on a memory router with fake services, the real questionnaire and the invented
// ingredient fixtures (tests/fixtures/inci-content.json), for the screens of stage 8.

export const APP_NOW = Date.UTC(2026, 0, 5, 12);

export function appBundle(): ContentBundle {
  const real = createRealContent('demo').bundle;
  return {
    ...real,
    ingredients: inciContent.ingredients,
    ingredientGroups: inciContent.ingredientGroups,
    compatRules: inciContent.compatRules,
  };
}

export function productOf(
  id: string,
  name: string,
  text: string,
  partial: Partial<Product> = {},
): Product {
  const prepared = prepareComposition(text, inciContent);
  return {
    id,
    name,
    category: 'serum',
    inciRaw: text,
    ingredients: prepared.ingredients,
    compositionSource: 'pasted',
    userReactions: [],
    addedAt: '2026-01-02T10:00:00.000Z',
    ...partial,
  };
}

type Options = {
  persona?: TestAnswers | null;
  profilePatch?: Partial<SkinProfile>;
  products?: Product[];
  scans?: ScanResult[];
  routines?: Routine[];
  journal?: JournalEntry[];
  settings?: Partial<Settings>;
  /** The moment of the fake clock; without it the clock stands at 0 (as before stage 10). */
  now?: number;
  /** Fakes that replace the default ones (a label reader, photos, the photo switch...). */
  services?: Partial<Services>;
};

export function renderApp(path: string, options: Options = {}) {
  const bundle = appBundle();
  const store = createTestStore();
  const { actions } = store.getState();
  actions.onboarding.complete();
  if (options.persona) {
    const { profile } = buildProfile(options.persona, bundle, APP_NOW, {
      id: 'profile-1',
      revision: 1,
      createdAt: '2026-01-01T12:00:00.000Z',
    });
    actions.profile.set({ ...profile, ...options.profilePatch });
    actions.careSetup.set({
      scenario: 'none',
      ownedCategories: [],
      builtForRevision: profile.revision,
    });
  }
  actions.products.set(options.products ?? []);
  actions.scans.set(options.scans ?? []);
  actions.routine.set(options.routines ?? []);
  actions.journal.set(options.journal ?? []);
  if (options.settings) actions.settings.update(options.settings);

  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const services = createTestServices({
    content: createTestContent({ bundle }),
    ...(options.now === undefined ? {} : { clock: createFixedClock(options.now) }),
    ...options.services,
  });
  render(
    <TestProviders store={store} services={services}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { store, router, bundle, services };
}
