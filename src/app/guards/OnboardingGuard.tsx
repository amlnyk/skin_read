import { Navigate, Outlet } from 'react-router-dom';
import { useOnboardingStore } from '@/store';

// Sends the user to /onboarding until onboarding is completed.
export function OnboardingGuard() {
  const completed = useOnboardingStore((state) => state.completed);
  if (!completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}
