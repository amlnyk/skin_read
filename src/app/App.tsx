import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import type { AppRouter } from './router';

type Props = { router: AppRouter };

export function App({ router }: Props) {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
