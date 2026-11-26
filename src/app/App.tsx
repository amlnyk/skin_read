import { RouterProvider } from 'react-router-dom';
import type { UpdateNotifier } from '@/lib/pwa';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PersistenceGate } from './components/PersistenceGate';
import { Splash } from './components/Splash';
import type { AppRouter } from './router';
import { UpdateBanner } from './components/UpdateBanner';

type Props = { router: AppRouter; updates?: UpdateNotifier };

export function App({ router, updates }: Props) {
  return (
    <ErrorBoundary>
      <Splash />
      <PersistenceGate>
        {updates ? <UpdateBanner updates={updates} /> : null}
        <RouterProvider router={router} />
      </PersistenceGate>
    </ErrorBoundary>
  );
}
