import { createBrowserRouter } from 'react-router-dom';
import { CarePage } from '../features/care';
import { HomePage } from '../features/home';
import { ProfilePage } from '../features/profile';
import { ReferencePage } from '../features/reference';
import { ScanPage } from '../features/scan';
import { Layout } from './Layout';

export const router = createBrowserRouter([
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
]);
