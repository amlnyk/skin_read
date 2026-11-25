import { RouterProvider } from 'react-router-dom';
import type { UpdateNotifier } from '@/lib/pwa';
import { ErrorBoundary } from './ErrorBoundary';
import { PersistenceGate } from './PersistenceGate';
import type { AppRouter } from './router';
import { UpdateBanner } from './UpdateBanner';

type Props = { router: AppRouter; updates?: UpdateNotifier };

export function App({ router, updates }: Props) {
  return (
    <ErrorBoundary>
      <PersistenceGate>
        {updates ? <UpdateBanner updates={updates} /> : null}
        <RouterProvider router={router} />
      </PersistenceGate>
    </ErrorBoundary>
  );
}
