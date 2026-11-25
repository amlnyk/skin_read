import type { ParsedIngredient, Product, Routine, Slot, SkinProfile } from '@/types';
import { checkPair, compatSeverity, type CompatContent, type CompatSubject } from '../deps';
import type { Draft } from '../types';
import { isPossible, newDraft } from '../types';

// Step 5. Conflicts with the routine: every component of the product against every component of
// the other products that stand in the routine. Only "caution" and "not recommended for the
// profile" results are reported ("no rule" never means "safe", and it is not reported either).
// Pairs inside the product itself are not looked at: a composition is made as a whole.

type Entry = { subject: CompatSubject; possible: boolean };

function subjectsOf(items: readonly ParsedIngredient[], slots?: readonly Slot[]): Entry[] {
  const entries: Entry[] = [];
  const seen = new Map<string, Entry>();
  const add = (kind: 'ingredient' | 'group', id: string, possible: boolean) => {
    const key = `${kind}:${id}`;
    const known = seen.get(key);
    if (known) {
      // one confirmed position makes the whole subject confirmed
      known.possible = known.possible && possible;
      return;
    }
    const entry: Entry = { subject: slots ? { kind, id, slots } : { kind, id }, possible };
    seen.set(key, entry);
    entries.push(entry);
  };
  for (const item of items) {
    if (item.matchType === 'unknown') continue;
    const possible = isPossible(item);
    if (item.ingredientId) add('ingredient', item.ingredientId, possible);
    else for (const id of item.groupIds) add('group', id, possible);
  }
  return entries;
}

/** The slots a product stands in, from the routine. */
function slotsInRoutine(routines: readonly Routine[], productId: string): Slot[] {
  return routines
    .filter((routine) => routine.steps.some((step) => step.productId === productId))
    .map((routine) => routine.slot);
}

export function routineConflicts(
  product: Pick<Product, 'id' | 'slot'>,
  items: readonly ParsedIngredient[],
  routines: readonly Routine[],
  products: readonly Product[],
  profile: Pick<SkinProfile, 'conditions' | 'reactions'>,
  content: CompatContent,
): Draft[] {
  const mine = subjectsOf(items, product.slot ? [product.slot] : undefined);
  const ctx = { profile: { conditions: profile.conditions, reactions: profile.reactions } };

  const otherIds = [
    ...new Set(
      routines
        .flatMap((routine) => routine.steps.map((step) => step.productId))
        .filter((id): id is string => id !== undefined && id !== product.id),
    ),
  ];

  const found: { draft: Draft; severity: number }[] = [];
  const seen = new Set<string>();
  for (const otherId of otherIds) {
    const other = products.find((entry) => entry.id === otherId);
    if (!other) continue;
    const otherSlots = slotsInRoutine(routines, otherId);
    // the other product's unconfirmed positions are not a basis for a conflict
    const theirs = subjectsOf(
      other.ingredients.filter((item) => !isPossible(item)),
      otherSlots,
    );
    for (const a of mine) {
      for (const b of theirs) {
        if (a.subject.kind === b.subject.kind && a.subject.id === b.subject.id) continue;
        const result = checkPair(a.subject, b.subject, ctx, content);
        if (result.status !== 'caution' && result.status !== 'not_recommended_for_profile')
          continue;
        const dedupe = `${otherId}|${result.ruleId ?? ''}|${a.subject.id}|${b.subject.id}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        const shared = (a.subject.slots ?? otherSlots).find((slot) => otherSlots.includes(slot));
        found.push({
          severity: compatSeverity(result.status),
          draft: newDraft({
            kind: 'conflict',
            ruleId: result.ruleId,
            key: result.status,
            ingredientIds: [a, b].flatMap((entry) =>
              entry.subject.kind === 'ingredient' ? [entry.subject.id] : [],
            ),
            groupIds: [a, b].flatMap((entry) =>
              entry.subject.kind === 'group' ? [entry.subject.id] : [],
            ),
            productIds: [otherId],
            slot: shared ?? null,
            possible: a.possible,
          }),
        });
      }
    }
  }
  // the most important first; the sort is stable, so equal severities keep the order found
  return found.sort((x, y) => x.severity - y.severity).map((entry) => entry.draft);
}
