import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { t } from '@/i18n';
import { HomePage } from '@/features/home';
import { OnboardingPage } from '@/features/onboarding';
import { ProfilePage, ResultPage } from '@/features/profile';
import { AnalysisPage, RoutinePage } from '@/features/routine';
import { OnboardingGuard } from './guards/OnboardingGuard';
import { Layout } from './components/Layout';
import { NotFoundPage } from './pages/NotFoundPage';

// Heavy features are loaded on demand (separate chunks): scan, compat.
// The journal, the compare screen and the settings load on demand too.
const ScanPage = lazy(() => import('@/features/scan').then((m) => ({ default: m.ScanPage })));
const PastePage = lazy(() => import('@/features/scan').then((m) => ({ default: m.PastePage })));
const PhotoPage = lazy(() => import('@/features/scan').then((m) => ({ default: m.PhotoPage })));
const ReviewPage = lazy(() => import('@/features/scan').then((m) => ({ default: m.ReviewPage })));
const ScanResultPage = lazy(() =>
  import('@/features/scan').then((m) => ({ default: m.ScanResultPage })),
);
const CheckProductPage = lazy(() =>
  import('@/features/scan').then((m) => ({ default: m.CheckProductPage })),
);
const HistoryPage = lazy(() => import('@/features/scan').then((m) => ({ default: m.HistoryPage })));
const CollectionPage = lazy(() =>
  import('@/features/products').then((m) => ({ default: m.CollectionPage })),
);
const AddProductPage = lazy(() =>
  import('@/features/products').then((m) => ({ default: m.AddProductPage })),
);
const ProductPage = lazy(() =>
  import('@/features/products').then((m) => ({ default: m.ProductPage })),
);
const CompatCheckerPage = lazy(() =>
  import('@/features/compat').then((m) => ({ default: m.CompatCheckerPage })),
);
const ComparePage = lazy(() =>
  import('@/features/compare').then((m) => ({ default: m.ComparePage })),
);
const JournalPage = lazy(() =>
  import('@/features/journal').then((m) => ({ default: m.JournalPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.SettingsPage })),
);
const RemindersPage = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.RemindersPage })),
);
const ConsentsPage = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.ConsentsPage })),
);
const DataPage = lazy(() => import('@/features/settings').then((m) => ({ default: m.DataPage })));
const AboutPage = lazy(() => import('@/features/about').then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() =>
  import('@/features/about').then((m) => ({ default: m.PrivacyPage })),
);
const DisclaimerPage = lazy(() =>
  import('@/features/about').then((m) => ({ default: m.DisclaimerPage })),
);
// The test has its own full-screen layout (no bottom navigation) and loads on demand.
const TestPage = lazy(() => import('@/features/test').then((m) => ({ default: m.TestPage })));

// Design review page (temporary, see features/design/README.md): kept in every build so the
// author can check the design on Vercel Preview from a phone.
const DesignPage = lazy(() => import('@/features/design').then((m) => ({ default: m.DesignPage })));

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
  {
    path: '/design',
    element: (
      <Suspense fallback={<Loading />}>
        <DesignPage />
      </Suspense>
    ),
  },
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
          { path: 'care', element: <RoutinePage /> },
          { path: 'care/analysis', element: <AnalysisPage /> },
          { path: 'care/products', element: <CollectionPage /> },
          { path: 'care/compare', element: <ComparePage /> },
          { path: 'care/products/new', element: <AddProductPage /> },
          { path: 'care/products/:id', element: <ProductPage /> },
          { path: 'scan', element: <ScanPage /> },
          { path: 'scan/paste', element: <PastePage /> },
          { path: 'scan/photo', element: <PhotoPage /> },
          { path: 'scan/review', element: <ReviewPage /> },
          { path: 'scan/check/:productId', element: <CheckProductPage /> },
          { path: 'scan/result/:id', element: <ScanResultPage /> },
          { path: 'compat', element: <CompatCheckerPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'profile/history', element: <HistoryPage /> },
          { path: 'profile/journal', element: <JournalPage /> },
          { path: 'profile/settings', element: <SettingsPage /> },
          { path: 'profile/settings/reminders', element: <RemindersPage /> },
          { path: 'profile/settings/consents', element: <ConsentsPage /> },
          { path: 'profile/settings/data', element: <DataPage /> },
          { path: 'profile/about', element: <AboutPage /> },
          { path: 'profile/privacy', element: <PrivacyPage /> },
          { path: 'profile/disclaimer', element: <DisclaimerPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export type AppRouter = ReturnType<typeof createAppRouter>;
