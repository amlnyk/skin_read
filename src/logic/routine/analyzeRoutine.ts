import type {
  ObservationKind,
  ObservationSeverity,
  Product,
  Routine,
  RoutineObservation,
  SkinProfile,
  Slot,
} from '@/types';
import type { AnalyzeContent } from '../analyze';
import { DEFAULT_ROUTINE_CONFIG, type RoutineConfig } from '../config';
import type { ProfileAnalysis } from '../profile';
import {
  conflictChecks,
  doctorChecks,
  duplicateChecks,
  incompleteChecks,
  manyActivesChecks,
  missingBaseChecks,
  personalChecks,
  preferenceChecks,
  type Candidate,
  type CheckContext,
} from './routineChecks';
import { bySlotOrder, routineProducts } from './routineProducts';

// The analysis of the whole routine (stage 9): what is wrong with the set of products and why.
// No numbers and no "score of the routine": a list of observations, in a fixed order.
//
// The order of the list: personal restrictions, conflicts, many active products in one slot,
// duplicated actives, missing base steps, wishes, products the analysis could not read, and a
// note about the doctor's scheme. Inside one kind the more important comes first.

const KIND_ORDER: readonly ObservationKind[] = [
  'personal_restriction',
  'conflict',
  'many_actives_in_slot',
  'duplicate_active',
  'missing_base_step',
  'preference_mismatch',
  'incomplete_data',
  'doctor_note',
];

const SEVERITY_RANK: Readonly<Record<ObservationSeverity, number>> = {
  important: 0,
  attention: 1,
  info: 2,
};

const isSlot = (value: string): value is Slot => value === 'am' || value === 'pm';

/** The slots of an observation always read morning first, whatever order they were found in. */
function sortSlots(params: Record<string, string[]>): Record<string, string[]> {
  const slots = params['slots'];
  return slots ? { ...params, slots: bySlotOrder(slots.filter(isSlot)) } : params;
}

function mergeParams(into: Record<string, string[]>, from: Record<string, string[]>): void {
  for (const [key, values] of Object.entries(from)) {
    const known = into[key] ?? [];
    for (const value of values) if (!known.includes(value)) known.push(value);
    into[key] = known;
  }
}

/** The same observation seen twice (morning and evening) becomes one, with both slots. */
function merge(candidates: readonly Candidate[]): Candidate[] {
  const merged = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const known = merged.get(candidate.merge);
    if (!known) {
      merged.set(candidate.merge, {
        ...candidate,
        params: Object.fromEntries(
          Object.entries(candidate.params).map(([key, list]) => [key, [...list]]),
        ),
        productIds: [...candidate.productIds],
      });
      continue;
    }
    mergeParams(known.params, candidate.params);
    for (const id of candidate.productIds)
      if (!known.productIds.includes(id)) known.productIds.push(id);
    if (SEVERITY_RANK[candidate.severity] < SEVERITY_RANK[known.severity])
      known.severity = candidate.severity;
  }
  return [...merged.values()].map((candidate) => ({
    ...candidate,
    params: sortSlots(candidate.params),
  }));
}

/**
 * The observations about the routine. An empty routine (no product in it) gives an empty list:
 * that is the empty state of the screen, not an error. A routine with only some of the products
 * is analysed as it is; nothing asks for a full set.
 */
export function analyzeRoutine(
  routines: readonly Routine[],
  products: readonly Product[],
  profile: SkinProfile,
  analysis: Pick<ProfileAnalysis, 'restrictions'>,
  content: AnalyzeContent,
  config: RoutineConfig = DEFAULT_ROUTINE_CONFIG,
): RoutineObservation[] {
  const entries = routineProducts(routines, products);
  if (entries.length === 0) return [];

  const ctx: CheckContext = { entries, routines, products, profile, analysis, content, config };
  const candidates = [
    ...personalChecks(ctx),
    ...conflictChecks(ctx),
    ...manyActivesChecks(ctx),
    ...duplicateChecks(ctx),
    ...missingBaseChecks(ctx),
    ...preferenceChecks(ctx),
    ...incompleteChecks(ctx),
    ...doctorChecks(ctx),
  ];

  // the sort is stable: equal kinds and severities keep the order the checks found them in
  return merge(candidates)
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
    )
    .map((candidate, index): RoutineObservation => ({
      id: `routine-observation-${index + 1}`,
      kind: candidate.kind,
      severity: candidate.severity,
      templateId: candidate.templateId,
      params: candidate.params,
      relatedProductIds: candidate.productIds,
      ...(candidate.ruleId ? { ruleId: candidate.ruleId } : {}),
    }));
}
