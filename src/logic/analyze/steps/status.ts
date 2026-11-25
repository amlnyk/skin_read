import type { ScanStatus } from '@/types';
import type { ProductCoverage } from '../composition';
import type { Draft } from '../types';

// Step 9. The status is decided by PRIORITY, never by the number of warnings:
//   1. a personal restriction                          -> personal_warnings
//   2. not enough information (no or weak composition) -> insufficient_info
//   3. a caution, a conflict, a duplicate or a wish    -> caution
//   4. otherwise                                       -> may_fit
// So a product with an acid that a person reacts to stays "personal_warnings" even when its
// composition is too short, and one restriction outweighs ten cautions.
// "may_fit" means only "nothing in our data speaks against it". It is never "safe".

const CAUTION_KINDS: ReadonlySet<Draft['kind']> = new Set([
  'ingredient_caution',
  'conflict',
  'duplicate_active',
  'preference_mismatch',
]);

export function decideStatus(
  warnings: readonly Draft[],
  hasComposition: boolean,
  coverage: ProductCoverage,
): ScanStatus {
  if (warnings.some((warning) => warning.kind === 'personal_restriction'))
    return 'personal_warnings';
  if (!hasComposition || !coverage.isSufficient) return 'insufficient_info';
  if (warnings.some((warning) => CAUTION_KINDS.has(warning.kind))) return 'caution';
  return 'may_fit';
}
