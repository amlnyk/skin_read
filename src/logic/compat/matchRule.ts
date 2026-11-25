import type { CompatibilityRule } from '@/schemas';
import { covers, sharesSlot } from './subjects';
import type { CompatContent, CompatContext, CompatSubject } from './types';

// Finds the rule for a pair. Rules are data (compat-rules.json), never code.
//
// A rule fits when its two sides cover the two subjects, in either order.
// When several rules fit, the first of these wins:
//   1. "caution" before "info" (the careful rule is never hidden by a calm one);
//   2. a higher `priority`;
//   3. a more specific rule (an ingredient side is more specific than a group side);
//   4. the earlier rule in the file.
// A rule with `sameSlotOnly` does not apply to components that are used in different slots.

export type RuleMatch = {
  /** The rule that applies, or null. */
  rule: CompatibilityRule | null;
  /** true: some rule fits the pair but only for the same slot, and the slots differ. */
  skippedBySlot: boolean;
};

function fitsPair(
  rule: CompatibilityRule,
  a: CompatSubject,
  b: CompatSubject,
  content: CompatContent,
): boolean {
  return (
    (covers(a, rule.a, content) && covers(b, rule.b, content)) ||
    (covers(b, rule.a, content) && covers(a, rule.b, content))
  );
}

function specificity(rule: CompatibilityRule): number {
  return (rule.a.kind === 'ingredient' ? 1 : 0) + (rule.b.kind === 'ingredient' ? 1 : 0);
}

function levelRank(rule: CompatibilityRule): number {
  return rule.level === 'caution' ? 0 : 1;
}

function compare(
  x: { rule: CompatibilityRule; order: number },
  y: { rule: CompatibilityRule; order: number },
): number {
  return (
    levelRank(x.rule) - levelRank(y.rule) ||
    y.rule.priority - x.rule.priority ||
    specificity(y.rule) - specificity(x.rule) ||
    x.order - y.order
  );
}

export function matchRule(
  a: CompatSubject,
  b: CompatSubject,
  content: CompatContent,
  ctx: CompatContext = {},
): RuleMatch {
  const fitting = content.compatRules
    .map((rule, order) => ({ rule, order }))
    .filter((entry) => fitsPair(entry.rule, a, b, content));

  const sameSlot = sharesSlot(a, b, ctx);
  const applicable = fitting.filter((entry) => sameSlot || !entry.rule.sameSlotOnly);
  const best = [...applicable].sort(compare)[0];
  return {
    rule: best?.rule ?? null,
    skippedBySlot: !best && fitting.length > 0,
  };
}
