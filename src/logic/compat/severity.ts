import type { CompatStatus } from '@/schemas';

// How important a result is: the smaller the number, the more important. Used to put the
// results of a list in order (here and in the product analysis).
const SEVERITY: Readonly<Record<CompatStatus, number>> = {
  not_recommended_for_profile: 0,
  caution: 1,
  insufficient_info: 2,
  no_known_conflicts: 3,
};

export function compatSeverity(status: CompatStatus): number {
  return SEVERITY[status];
}
