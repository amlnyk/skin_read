import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store';

// Sends the user to /onboarding until onboarding is completed.
export function OnboardingGuard() {
  const completed = useAppStore((state) => state.onboarding.completed);
  if (!completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}
