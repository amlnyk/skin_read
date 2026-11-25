import { describe, expect, it } from 'vitest';
import type { CompatibilityRule } from '@/schemas';
import { inciContent, withoutRules } from '@/test/data/inciFixtures';
import { checkPair } from '../checkPair';
import { matchRule } from '../matchRule';
import type { CompatContext, CompatSubject } from '../types';

const ing = (id: string, slots?: CompatSubject['slots']): CompatSubject =>
  slots ? { kind: 'ingredient', id, slots } : { kind: 'ingredient', id };
const grp = (id: string): CompatSubject => ({ kind: 'group', id });

const PM: CompatContext = { slot: 'pm' };
const calm = { conditions: [], reactions: [] } as const;

function rule(overrides: Partial<CompatibilityRule> & Pick<CompatibilityRule, 'id' | 'a' | 'b'>) {
  return {
    source: 'test fixture',
    reviewStatus: 'draft',
    level: 'caution',
    sameSlotOnly: false,
    explanation: `text of ${overrides.id}`,
    timingAdvice: null,
    priority: 0,
    ...overrides,
  } satisfies CompatibilityRule;
}

describe('checkPair: a caution rule', () => {
  it('gives "caution" with the rule, the explanation and the timing advice', () => {
    const result = checkPair(
      ing('retinol'),
      ing('lactic-acid'),
      { ...PM, profile: calm },
      inciContent,
    );
    expect(result).toMatchObject({
      status: 'caution',
      reason: 'rule_caution',
      ruleId: 'r-retinol-lactic',
      explanation: 'Test caution explanation (ingredient level).',
      timingAdvice: 'Test timing advice (ingredient level).',
      conditionNotes: [],
      source: 'test fixture',
      reviewStatus: 'draft',
    });
  });

  it('never uses the words "безпечно" or "заборонено"', () => {
    const result = checkPair(ing('retinol'), ing('lactic-acid'), PM, inciContent);
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/безпечно|заборонено/u);
  });

  it('does not depend on the order of the two components', () => {
    const forward = checkPair(ing('retinol'), ing('lactic-acid'), PM, inciContent);
    const backward = checkPair(ing('lactic-acid'), ing('retinol'), PM, inciContent);
    expect(backward.status).toBe(forward.status);
    expect(backward.ruleId).toBe(forward.ruleId);
  });

  it('is "not_recommended_for_profile" when the profile has a listed condition', () => {
    const profile = { conditions: ['sensitive'], reactions: [] } as const;
    const result = checkPair(ing('retinol'), ing('lactic-acid'), { ...PM, profile }, inciContent);
    expect(result).toMatchObject({
      status: 'not_recommended_for_profile',
      reason: 'rule_escalated',
      ruleId: 'r-retinol-lactic',
      conditionNotes: [{ kind: 'condition', value: 'sensitive' }],
    });
    expect(result.explanation).not.toBeNull();
  });

  it('is "not_recommended_for_profile" when the profile has a listed reaction', () => {
    const profile = { conditions: [], reactions: ['acids'] } as const;
    const result = checkPair(ing('retinol'), ing('lactic-acid'), { ...PM, profile }, inciContent);
    expect(result.status).toBe('not_recommended_for_profile');
    expect(result.conditionNotes).toEqual([{ kind: 'reaction', value: 'acids' }]);
  });

  it('lists every value of the profile that raised the caution', () => {
    const profile = {
      conditions: ['reactive', 'dehydrated', 'sensitive'],
      reactions: ['retinoids'],
    } as const;
    const result = checkPair(ing('retinol'), ing('lactic-acid'), { ...PM, profile }, inciContent);
    expect(result.conditionNotes).toEqual([
      { kind: 'condition', value: 'reactive' },
      { kind: 'condition', value: 'sensitive' },
      { kind: 'reaction', value: 'retinoids' },
    ]);
  });

  it('stays "caution" when the profile has only unrelated values', () => {
    const profile = { conditions: ['dehydrated'], reactions: ['none_noticed'] } as const;
    const result = checkPair(ing('retinol'), ing('lactic-acid'), { ...PM, profile }, inciContent);
    expect(result.status).toBe('caution');
  });

  it('stays "caution" without a profile', () => {
    expect(
      checkPair(ing('retinol'), ing('lactic-acid'), { slot: 'pm', profile: null }, inciContent)
        .status,
    ).toBe('caution');
    expect(checkPair(ing('retinol'), ing('lactic-acid'), {}, inciContent).status).toBe('caution');
  });

  it('keeps the text empty when the rule has no text yet', () => {
    const result = checkPair(ing('ascorbic-acid'), ing('glycolic-acid'), PM, inciContent);
    expect(result).toMatchObject({
      status: 'caution',
      ruleId: 'r-vitc-aha',
      explanation: null,
      timingAdvice: null,
    });
  });
});

describe('checkPair: groups', () => {
  it('uses a group rule for ingredients of those groups', () => {
    const result = checkPair(ing('retinol'), ing('glycolic-acid'), PM, inciContent);
    expect(result).toMatchObject({ status: 'caution', ruleId: 'r-retinoids-aha' });
  });

  it('works for a group and an ingredient', () => {
    const result = checkPair(grp('retinoids'), ing('glycolic-acid'), PM, inciContent);
    expect(result.ruleId).toBe('r-retinoids-aha');
  });

  it('works for two groups', () => {
    const result = checkPair(grp('retinoids'), grp('aha'), PM, inciContent);
    expect(result).toMatchObject({ status: 'caution', ruleId: 'r-retinoids-aha' });
  });

  it('does not take an ingredient rule for a group', () => {
    // r-retinol-lactic is about two ingredients: the group "aha" must not trigger it
    const result = checkPair(ing('retinol'), grp('aha'), PM, inciContent);
    expect(result.ruleId).toBe('r-retinoids-aha');
  });
});

describe('checkPair: info rules and no rule', () => {
  it('gives "no_known_conflicts" with the explanation of an info rule', () => {
    const result = checkPair(ing('niacinamide'), ing('ascorbic-acid'), PM, inciContent);
    expect(result).toMatchObject({
      status: 'no_known_conflicts',
      reason: 'rule_info',
      ruleId: 'r-niacinamide-vitc',
      explanation: 'Test info explanation (niacinamide and vitamin C).',
    });
  });

  it('never raises an info rule, whatever the profile says', () => {
    const profile = { conditions: ['sensitive'], reactions: ['acids'] } as const;
    const result = checkPair(
      ing('niacinamide'),
      ing('ascorbic-acid'),
      { ...PM, profile },
      inciContent,
    );
    expect(result.status).toBe('no_known_conflicts');
    expect(result.conditionNotes).toEqual([]);
  });

  it('gives "no_known_conflicts" without a rule, with no text of its own', () => {
    const result = checkPair(ing('glycerin'), ing('panthenol'), PM, inciContent);
    expect(result).toMatchObject({
      status: 'no_known_conflicts',
      reason: 'no_rule',
      ruleId: null,
      explanation: null,
      timingAdvice: null,
      source: null,
      reviewStatus: null,
    });
  });

  it('gives "insufficient_info" when a component is not in the content', () => {
    const result = checkPair(ing('glycerin'), ing('no-such-ingredient'), PM, inciContent);
    expect(result).toMatchObject({
      status: 'insufficient_info',
      reason: 'unknown_subject',
      ruleId: null,
      unknownSubjects: [{ kind: 'ingredient', id: 'no-such-ingredient' }],
    });
  });

  it('lists both components when both are unknown', () => {
    const result = checkPair(ing('x'), grp('y'), PM, inciContent);
    expect(result.status).toBe('insufficient_info');
    expect(result.unknownSubjects).toHaveLength(2);
  });

  it('does not call a group known when only an ingredient has that id', () => {
    expect(checkPair(grp('glycerin'), ing('aqua'), PM, inciContent).status).toBe(
      'insufficient_info',
    );
  });
});

describe('checkPair: slots', () => {
  it('does not apply a same-slot rule to different slots', () => {
    const content = withoutRules(['r-retinoids-acids-info']);
    const result = checkPair(ing('retinol', ['am']), ing('lactic-acid', ['pm']), {}, content);
    expect(result).toMatchObject({
      status: 'no_known_conflicts',
      reason: 'other_slots',
      ruleId: null,
    });
  });

  it('is "no_known_conflicts" for different slots even when an info rule covers the pair', () => {
    const result = checkPair(ing('retinol', ['am']), ing('lactic-acid', ['pm']), {}, inciContent);
    expect(result.status).toBe('no_known_conflicts');
  });

  it('applies the rule when the slots overlap', () => {
    const result = checkPair(
      ing('retinol', ['am', 'pm']),
      ing('lactic-acid', ['pm']),
      {},
      inciContent,
    );
    expect(result.status).toBe('caution');
  });

  it('takes the slot of the context when the component has none', () => {
    expect(
      checkPair(ing('retinol'), ing('lactic-acid', ['pm']), { slot: 'am' }, inciContent).status,
    ).toBe('no_known_conflicts');
    expect(
      checkPair(ing('retinol'), ing('lactic-acid', ['pm']), { slot: 'pm' }, inciContent).status,
    ).toBe('caution');
  });

  it('is careful when the slots are unknown', () => {
    expect(checkPair(ing('retinol'), ing('lactic-acid'), {}, inciContent).status).toBe('caution');
  });

  it('applies a rule without "sameSlotOnly" to any slots', () => {
    const result = checkPair(
      ing('niacinamide', ['am']),
      ing('ascorbic-acid', ['pm']),
      {},
      inciContent,
    );
    expect(result.ruleId).toBe('r-niacinamide-vitc');
  });
});

describe('matchRule: which rule wins', () => {
  const content = (rules: CompatibilityRule[]) => ({ ...inciContent, compatRules: rules });
  const a = ing('retinol');
  const b = ing('lactic-acid');
  const pair = { a: { kind: 'group', id: 'retinoids' }, b: { kind: 'group', id: 'aha' } } as const;
  const exact = {
    a: { kind: 'ingredient', id: 'retinol' },
    b: { kind: 'ingredient', id: 'lactic-acid' },
  } as const;

  it('finds nothing when no rule fits', () => {
    expect(matchRule(ing('glycerin'), ing('aqua'), inciContent)).toEqual({
      rule: null,
      skippedBySlot: false,
    });
  });

  it('puts "caution" before "info", even when the info rule has a higher priority', () => {
    const rules = [
      rule({ id: 'info', ...pair, level: 'info', priority: 100 }),
      rule({ id: 'caution', ...pair, level: 'caution', priority: 1 }),
    ];
    expect(matchRule(a, b, content(rules)).rule?.id).toBe('caution');
  });

  it('puts a higher priority first', () => {
    const rules = [
      rule({ id: 'low', ...pair, priority: 1 }),
      rule({ id: 'high', ...pair, priority: 2 }),
    ];
    expect(matchRule(a, b, content(rules)).rule?.id).toBe('high');
  });

  it('puts an ingredient rule before a group rule of the same priority', () => {
    const rules = [rule({ id: 'group', ...pair }), rule({ id: 'ingredient', ...exact })];
    expect(matchRule(a, b, content(rules)).rule?.id).toBe('ingredient');
  });

  it('puts the priority before the specificity', () => {
    const rules = [
      rule({ id: 'group', ...pair, priority: 5 }),
      rule({ id: 'ingredient', ...exact }),
    ];
    expect(matchRule(a, b, content(rules)).rule?.id).toBe('group');
  });

  it('keeps the file order for equal rules', () => {
    const rules = [rule({ id: 'first', ...pair }), rule({ id: 'second', ...pair })];
    expect(matchRule(a, b, content(rules)).rule?.id).toBe('first');
  });

  it('falls through to another rule when the best one is for the same slot only', () => {
    const rules = [
      rule({ id: 'same-slot', ...pair, priority: 9, sameSlotOnly: true }),
      rule({ id: 'any-slot', ...pair }),
    ];
    const result = matchRule(ing('retinol', ['am']), ing('lactic-acid', ['pm']), content(rules));
    expect(result.rule?.id).toBe('any-slot');
  });

  it('says that a rule was skipped because of the slots', () => {
    const rules = [rule({ id: 'same-slot', ...pair, sameSlotOnly: true })];
    const result = matchRule(ing('retinol', ['am']), ing('lactic-acid', ['pm']), content(rules));
    expect(result).toEqual({ rule: null, skippedBySlot: true });
  });
});
