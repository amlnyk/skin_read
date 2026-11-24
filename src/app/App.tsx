import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { PersistenceGate } from './PersistenceGate';
import type { AppRouter } from './router';

type Props = { router: AppRouter };

export function App({ router }: Props) {
  return (
    <ErrorBoundary>
      <PersistenceGate>
        <RouterProvider router={router} />
      </PersistenceGate>
    </ErrorBoundary>
  );
}
