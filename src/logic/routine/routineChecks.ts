import { OBSERVATION_TEMPLATE_IDS } from '@/schemas';
import type {
  ObservationKind,
  ObservationSeverity,
  ParsedIngredient,
  Product,
  ProductCategory,
  Routine,
  SkinProfile,
  Slot,
} from '@/types';
import {
  coverageOfComposition,
  isPossible,
  needsComposition,
  personalRestrictions,
  preferenceMismatches,
  resolveComposition,
  type AnalyzeContent,
} from '../analyze';
import { checkPair, compatSeverity, type CompatResult, type CompatSubject } from '../compat';
import type { RoutineConfig } from '../config';
import type { ProfileAnalysis } from '../profile';
import { bySlotOrder, categoriesInSlots, type RoutineEntry } from './routineProducts';

// The checks of the whole routine. Each one returns candidates; analyzeRoutine merges the ones
// that are the same observation seen twice (the morning and the evening), puts them in order and
// gives them ids. A check never writes a sentence: ids and keys only.

export type Candidate = {
  kind: ObservationKind;
  severity: ObservationSeverity;
  templateId: string;
  /** Candidates with the same merge key are one observation. */
  merge: string;
  params: Record<string, string[]>;
  productIds: string[];
  ruleId?: string;
};

export type CheckContext = {
  entries: readonly RoutineEntry[];
  routines: readonly Routine[];
  products: readonly Product[];
  profile: SkinProfile;
  analysis: Pick<ProfileAnalysis, 'restrictions'>;
  content: AnalyzeContent;
  config: RoutineConfig;
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** The positions the analysis may rely on: recognised and not waiting for a confirmation. */
function confirmed(items: readonly ParsedIngredient[]): ParsedIngredient[] {
  return items.filter((item) => item.matchType !== 'unknown' && !isPossible(item));
}

function itemsOf(product: Product, content: AnalyzeContent): ParsedIngredient[] {
  return needsComposition(product) ? [] : resolveComposition(product, content).ingredients;
}

// ---- 1. Personal restrictions: reactions the person told us about ----
export function personalChecks({ entries, profile, analysis, content }: CheckContext): Candidate[] {
  const found: Candidate[] = [];
  for (const { product, slots } of entries) {
    const drafts = personalRestrictions(itemsOf(product, content), profile, analysis, content);
    for (const draft of drafts) {
      // an unconfirmed fuzzy match is only "possible": the routine analysis leaves it to the check of the product
      if (draft.possible) continue;
      found.push({
        kind: 'personal_restriction',
        severity: 'important',
        templateId: OBSERVATION_TEMPLATE_IDS.personalRestriction,
        merge: [
          'pr',
          draft.via,
          draft.key,
          draft.ingredientIds.join(','),
          draft.groupIds.join(','),
        ].join('|'),
        params: {
          slots,
          keys: draft.key ? [draft.key] : [],
          ingredients: draft.ingredientIds,
          groups: draft.groupIds,
          via: draft.via ? [draft.via] : [],
        },
        productIds: [product.id],
      });
    }
  }
  return found;
}

// ---- 2. Conflicts between products ----
type Hit = {
  result: CompatResult;
  ingredients: Set<string>;
  groups: Set<string>;
  escalation: Set<string>;
};

function subjectsOf(items: readonly ParsedIngredient[], slots: readonly Slot[]): CompatSubject[] {
  const seen = new Set<string>();
  const subjects: CompatSubject[] = [];
  const add = (kind: 'ingredient' | 'group', id: string) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    subjects.push({ kind, id, slots });
  };
  for (const item of confirmed(items)) {
    if (item.ingredientId) add('ingredient', item.ingredientId);
    else for (const id of item.groupIds) add('group', id);
  }
  return subjects;
}

/**
 * Every pair of products against each other: the components of one against the components of the
 * other, with the slots the products stand in (a rule that holds in one slot only is not applied
 * to a morning product and an evening product). One observation for a pair of products: the most
 * important rule that was found; the rest of the pair stays visible in the check of a product.
 */
export function conflictChecks({ entries, profile, content }: CheckContext): Candidate[] {
  const ctx = { profile: { conditions: profile.conditions, reactions: profile.reactions } };
  const found: Candidate[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (!left || !right) continue;
      const as = subjectsOf(itemsOf(left.product, content), left.slots);
      const bs = subjectsOf(itemsOf(right.product, content), right.slots);

      let best: Hit | null = null;
      const ingredients = new Set<string>();
      const groups = new Set<string>();
      for (const a of as) {
        for (const b of bs) {
          if (a.kind === b.kind && a.id === b.id) continue;
          const result = checkPair(a, b, ctx, content);
          if (result.status !== 'caution' && result.status !== 'not_recommended_for_profile')
            continue;
          for (const subject of [a, b])
            (subject.kind === 'ingredient' ? ingredients : groups).add(subject.id);
          if (!best || compatSeverity(result.status) < compatSeverity(best.result.status)) {
            best = {
              result,
              ingredients,
              groups,
              escalation: new Set(result.conditionNotes.map((note) => note.value)),
            };
          }
        }
      }
      if (!best) continue;

      const shared = bySlotOrder(left.slots.filter((slot) => right.slots.includes(slot)));
      const escalated = best.result.status === 'not_recommended_for_profile';
      found.push({
        kind: 'conflict',
        severity: escalated ? 'important' : 'attention',
        templateId: OBSERVATION_TEMPLATE_IDS.conflict,
        merge: `cf|${left.product.id}|${right.product.id}`,
        params: {
          slots: shared,
          ingredients: [...ingredients],
          groups: [...groups],
          conditions: [...best.escalation],
        },
        productIds: [left.product.id, right.product.id],
        ...(best.result.ruleId ? { ruleId: best.result.ruleId } : {}),
      });
    }
  }
  return found;
}

// ---- 3 and 4. Active products ----

/** Ids of the groups the content marks as "active". Not marked: nothing is guessed. */
const activeGroupIds = (content: AnalyzeContent): Set<string> =>
  new Set(
    content.ingredientGroups.filter((group) => group.active === true).map((group) => group.id),
  );

/** The active groups in a product (only recognised, confirmed positions). */
function activeGroupsOf(
  product: Product,
  active: ReadonlySet<string>,
  content: AnalyzeContent,
): string[] {
  return unique(
    confirmed(itemsOf(product, content)).flatMap((item) =>
      item.groupIds.filter((id) => active.has(id)),
    ),
  );
}

/**
 * A product counts as "active" when it has a component of a group marked active in the content,
 * or when the person put it in the category "exfoliant" (their own word for it).
 */
export function manyActivesChecks({
  entries,
  profile,
  content,
  config,
}: CheckContext): Candidate[] {
  const active = activeGroupIds(content);
  const found: Candidate[] = [];
  const sensitive = profile.conditions.includes('sensitive');

  for (const slot of ['am', 'pm'] as const) {
    const inSlot = entries
      .filter((entry) => entry.slots.includes(slot))
      .map((entry) => ({ entry, groups: activeGroupsOf(entry.product, active, content) }))
      .filter(({ entry, groups }) => groups.length > 0 || entry.product.category === 'exfoliant');
    if (inSlot.length < config.manyActivesInSlot) continue;
    const ids = inSlot.map(({ entry }) => entry.product.id);
    found.push({
      kind: 'many_actives_in_slot',
      severity: 'attention',
      templateId: sensitive
        ? OBSERVATION_TEMPLATE_IDS.manyActivesSensitive
        : OBSERVATION_TEMPLATE_IDS.manyActives,
      merge: `ma|${[...ids].sort().join(',')}`,
      params: { slots: [slot], groups: unique(inSlot.flatMap(({ groups }) => groups)) },
      productIds: ids,
    });
  }
  return found;
}

/** The same active group in two or more products of the routine. */
export function duplicateChecks({ entries, content }: CheckContext): Candidate[] {
  const found: Candidate[] = [];
  for (const group of content.ingredientGroups) {
    if (group.active !== true) continue;
    const sharing = entries.filter((entry) =>
      confirmed(itemsOf(entry.product, content)).some((item) => item.groupIds.includes(group.id)),
    );
    if (sharing.length < 2) continue;
    const slots = (['am', 'pm'] as const).filter(
      (slot) => sharing.filter((entry) => entry.slots.includes(slot)).length >= 2,
    );
    const ids = sharing.map((entry) => entry.product.id);
    found.push({
      kind: 'duplicate_active',
      severity: 'attention',
      templateId: OBSERVATION_TEMPLATE_IDS.duplicateActive,
      merge: `da|${[...ids].sort().join(',')}`,
      params: { slots, groups: [group.id] },
      productIds: ids,
    });
  }
  return found;
}

// ---- 5. Missing base steps ----

// The steps the base routine of the spec has: the morning cleanser is "if needed", so it is not
// asked for; sunscreen is the morning only.
export const REQUIRED_BASE_STEPS: Readonly<Record<Slot, readonly ProductCategory[]>> = {
  am: ['moisturizer', 'sunscreen'],
  pm: ['cleanser', 'moisturizer'],
};

const MISSING_TEMPLATES: Readonly<Partial<Record<ProductCategory, string>>> = {
  cleanser: OBSERVATION_TEMPLATE_IDS.missingCleanser,
  moisturizer: OBSERVATION_TEMPLATE_IDS.missingMoisturizer,
  sunscreen: OBSERVATION_TEMPLATE_IDS.missingSunscreen,
};

export function missingBaseChecks({ routines, products }: CheckContext): Candidate[] {
  const present = categoriesInSlots(routines, products);
  const found: Candidate[] = [];
  for (const slot of ['am', 'pm'] as const) {
    for (const category of REQUIRED_BASE_STEPS[slot]) {
      const templateId = MISSING_TEMPLATES[category];
      if (!templateId || present[slot].has(category)) continue;
      found.push({
        kind: 'missing_base_step',
        severity: 'info',
        templateId,
        merge: `mb|${category}`,
        params: { slots: [slot], categories: [category] },
        productIds: [],
      });
    }
  }
  return found;
}

// ---- 6. Wishes ("I want to avoid ...") ----
export function preferenceChecks({ entries, analysis, content }: CheckContext): Candidate[] {
  const found: Candidate[] = [];
  for (const { product, slots } of entries) {
    for (const draft of preferenceMismatches(itemsOf(product, content), analysis)) {
      if (draft.possible) continue;
      found.push({
        kind: 'preference_mismatch',
        severity: 'attention',
        templateId: OBSERVATION_TEMPLATE_IDS.preferenceMismatch,
        merge: `pm|${draft.key}`,
        params: {
          slots,
          keys: draft.key ? [draft.key] : [],
          ingredients: draft.ingredientIds,
          groups: draft.groupIds,
        },
        productIds: [product.id],
      });
    }
  }
  return found;
}

// ---- 7. Products the analysis could not read ----
export function incompleteChecks({ entries, content }: CheckContext): Candidate[] {
  const found: Candidate[] = [];
  for (const { product, slots } of entries) {
    let templateId: string | null = null;
    let key = '';
    if (needsComposition(product)) {
      templateId = OBSERVATION_TEMPLATE_IDS.incompleteNoComposition;
      key = 'no_composition';
    } else if (!coverageOfComposition(resolveComposition(product, content)).isSufficient) {
      templateId = OBSERVATION_TEMPLATE_IDS.incompleteLowCoverage;
      key = 'low_coverage';
    }
    if (templateId === null) continue;
    found.push({
      kind: 'incomplete_data',
      severity: 'info',
      templateId,
      merge: `id|${key}`,
      params: { slots, keys: [key] },
      productIds: [product.id],
    });
  }
  return found;
}

// ---- 8. A prescription or another medical note ----
export function doctorChecks({ analysis }: CheckContext): Candidate[] {
  return analysis.restrictions.medicalNotes.map((note): Candidate => ({
    kind: 'doctor_note',
    severity: 'info',
    templateId: OBSERVATION_TEMPLATE_IDS.doctorNote,
    merge: `dn|${note}`,
    params: { keys: [note] },
    productIds: [],
  }));
}
