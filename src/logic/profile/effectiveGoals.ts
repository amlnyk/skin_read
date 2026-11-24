import type { Goal } from '@/types';
import type { ProfileAnalysis } from './types';

/**
 * The goals that may drive recommendations. For users under 18 the anti-age goal is
 * kept in the profile (it is what they said) but does not drive any step.
 */
export function effectiveGoals(
  goals: readonly Goal[],
  analysis: Pick<ProfileAnalysis, 'minorMode'>,
): Goal[] {
  return goals.filter((goal) => !(analysis.minorMode && goal === 'anti_aging'));
}
