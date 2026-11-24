import { create } from 'zustand';

type OnboardingState = {
  completed: boolean;
  complete: () => void;
  reset: () => void;
};

// STUB. The real flag is persisted and set by the onboarding flow at a later stage.
// It starts as `true` so the app stays usable until then; the guard logic is covered by tests.
export const useOnboardingStore = create<OnboardingState>()((set) => ({
  completed: true,
  complete: () => set({ completed: true }),
  reset: () => set({ completed: false }),
}));
