import type { CompatibilityRule } from '@/schemas';
import { matchRule } from './matchRule';
import { isKnown } from './subjects';
import type {
  CompatContent,
  CompatContext,
  CompatResult,
  CompatSubject,
  ConditionNote,
} from './types';

// The result for one pair of components.
//
// - a component that is not in the content: "insufficient_info" (we do not guess);
// - a "caution" rule: "caution", or "not_recommended_for_profile" when the saved profile
//   contains one of the rule's `escalateWhen` conditions or reactions;
// - an "info" rule: "no_known_conflicts" with the rule's explanation;
// - no rule: "no_known_conflicts". That only means "nothing known in our data", never "safe".

function escalationNotes(rule: CompatibilityRule, ctx: CompatContext): ConditionNote[] {
  const when = rule.escalateWhen;
  const profile = ctx.profile;
  if (!when || !profile) return [];
  const notes: ConditionNote[] = [];
  for (const value of profile.conditions) {
    if (when.conditions.includes(value)) notes.push({ kind: 'condition', value });
  }
  for (const value of profile.reactions) {
    if (when.reactions.includes(value)) notes.push({ kind: 'reaction', value });
  }
  return notes;
}

function base(a: CompatSubject, b: CompatSubject): CompatResult {
  return {
    status: 'no_known_conflicts',
    reason: 'no_rule',
    a,
    b,
    ruleId: null,
    explanation: null,
    timingAdvice: null,
    conditionNotes: [],
    unknownSubjects: [],
    source: null,
    reviewStatus: null,
  };
}

export function checkPair(
  a: CompatSubject,
  b: CompatSubject,
  ctx: CompatContext,
  content: CompatContent,
): CompatResult {
  const result = base(a, b);

  const unknownSubjects = [a, b].filter((subject) => !isKnown(subject, content));
  if (unknownSubjects.length > 0) {
    return { ...result, status: 'insufficient_info', reason: 'unknown_subject', unknownSubjects };
  }

  const { rule, skippedBySlot } = matchRule(a, b, content, ctx);
  if (!rule) {
    return { ...result, reason: skippedBySlot ? 'other_slots' : 'no_rule' };
  }

  const withRule = {
    ...result,
    ruleId: rule.id,
    explanation: rule.explanation,
    timingAdvice: rule.timingAdvice,
    source: rule.source,
    reviewStatus: rule.reviewStatus,
  };

  if (rule.level === 'info') return { ...withRule, reason: 'rule_info' };

  const conditionNotes = escalationNotes(rule, ctx);
  if (conditionNotes.length > 0) {
    return {
      ...withRule,
      status: 'not_recommended_for_profile',
      reason: 'rule_escalated',
      conditionNotes,
    };
  }
  return { ...withRule, status: 'caution', reason: 'rule_caution' };
}
