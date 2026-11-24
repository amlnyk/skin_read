import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { CarePage } from '@/features/care';
import { HomePage } from '@/features/home';
import { OnboardingPage } from '@/features/onboarding';
import { ProfilePage } from '@/features/profile';
import { OnboardingGuard } from './guards/OnboardingGuard';
import { Layout } from './Layout';

// Heavy features are loaded on demand (separate chunks): scan, reference.
// journal and compare join this list when they appear.
const ScanPage = lazy(() => import('@/features/scan').then((m) => ({ default: m.ScanPage })));
const ReferencePage = lazy(() =>
  import('@/features/reference').then((m) => ({ default: m.ReferencePage })),
);

export const appRoutes: RouteObject[] = [
  { path: '/onboarding', element: <OnboardingPage /> },
  {
    element: <OnboardingGuard />,
    children: [
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
