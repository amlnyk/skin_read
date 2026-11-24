import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { t } from '@/i18n';
import { CarePage } from '@/features/care';
import { HomePage } from '@/features/home';
import { OnboardingPage } from '@/features/onboarding';
import { ProfilePage, ResultPage } from '@/features/profile';
import { OnboardingGuard } from './guards/OnboardingGuard';
import { Layout } from './Layout';

// Heavy features are loaded on demand (separate chunks): scan, reference.
// journal and compare join this list when they appear.
const ScanPage = lazy(() => import('@/features/scan').then((m) => ({ default: m.ScanPage })));
const ReferencePage = lazy(() =>
  import('@/features/reference').then((m) => ({ default: m.ReferencePage })),
);
// The test has its own full-screen layout (no bottom navigation) and loads on demand.
const TestPage = lazy(() => import('@/features/test').then((m) => ({ default: m.TestPage })));

function Loading() {
  return <p role="status">{t('common.loading')}</p>;
}

// Developer screens exist only in the dev build. In production `import.meta.env.DEV` is
// replaced with `false`, so the route and the whole dev feature are dropped from the bundle.
const DevStatePage = import.meta.env.DEV
  ? lazy(() => import('@/features/dev').then((m) => ({ default: m.DevStatePage })))
  : null;

const devRoutes: RouteObject[] = DevStatePage
  ? [
      {
        path: '/dev/state',
        element: (
          <Suspense fallback={<Loading />}>
            <DevStatePage />
          </Suspense>
        ),
      },
    ]
  : [];

export const appRoutes: RouteObject[] = [
  { path: '/onboarding', element: <OnboardingPage /> },
  ...devRoutes,
  {
    element: <OnboardingGuard />,
    children: [
      {
        path: '/test',
        element: (
          <Suspense fallback={<Loading />}>
            <TestPage />
          </Suspense>
        ),
      },
      {
        path: '/test/result',
        element: <ResultPage />,
      },
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'care', element: <CarePage /> },
          { path: 'scan', element: <ScanPage /> },
          { path: 'reference', element: <ReferencePage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export type AppRouter = ReturnType<typeof createAppRouter>;
