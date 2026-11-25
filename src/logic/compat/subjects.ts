import type { CompatRef } from '@/schemas';
import type { CompatContent, CompatContext, CompatSubject } from './types';

// A subject covers itself and, for an ingredient, the groups of the ingredient.
// An ingredient is covered by a rule about itself and by a rule about any of its groups.

export function isKnown(subject: CompatSubject, content: CompatContent): boolean {
  return subject.kind === 'ingredient'
    ? content.ingredients.some((ingredient) => ingredient.id === subject.id)
    : content.ingredientGroups.some((group) => group.id === subject.id);
}

function groupsOf(subject: CompatSubject, content: CompatContent): readonly string[] {
  if (subject.kind === 'group') return [subject.id];
  const ingredient = content.ingredients.find((entry) => entry.id === subject.id);
  return ingredient?.groups ?? [];
}

export function covers(subject: CompatSubject, ref: CompatRef, content: CompatContent): boolean {
  if (ref.kind === 'ingredient') return subject.kind === 'ingredient' && subject.id === ref.id;
  return groupsOf(subject, content).includes(ref.id);
}

/** null: unknown (the check then treats the slots as overlapping, which is the careful way). */
export function slotsOf(subject: CompatSubject, ctx: CompatContext) {
  if (subject.slots && subject.slots.length > 0) return subject.slots;
  return ctx.slot ? [ctx.slot] : null;
}

export function sharesSlot(a: CompatSubject, b: CompatSubject, ctx: CompatContext): boolean {
  const left = slotsOf(a, ctx);
  const right = slotsOf(b, ctx);
  if (!left || !right) return true;
  return left.some((slot) => right.includes(slot));
}

export function sameSubject(a: CompatSubject, b: CompatSubject): boolean {
  return a.kind === b.kind && a.id === b.id;
}
