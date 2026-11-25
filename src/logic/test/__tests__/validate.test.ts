import { describe, expect, it } from 'vitest';
import { findContradictions, validateAnswers } from '../validate';
import { all, conditions, question, reactions } from '../testSupport';

describe('findContradictions', () => {
  it('"Stable" with "Sensitive" is a contradiction', () => {
    expect(findContradictions({ q2_conditions: ['stable', 'sensitive'] })).toEqual([
      {
        id: 'stable_with_active_condition',
        questionId: 'q2_conditions',
        optionIds: ['stable', 'sensitive'],
      },
    ]);
  });

  it.each(['sensitive', 'reactive', 'breakouts'])('"Stable" with "%s" is a contradiction', (id) => {
    expect(findContradictions({ q2_conditions: ['stable', id] })).toHaveLength(1);
  });

  it('lists every active condition that was chosen', () => {
    const [found] = findContradictions({ q2_conditions: ['reactive', 'stable', 'breakouts'] });
    expect(found?.optionIds).toEqual(['stable', 'reactive', 'breakouts']);
  });

  it('"Stable" alone and "Stable" with "Dehydrated" are not contradictions', () => {
    expect(findContradictions({ q2_conditions: ['stable'] })).toEqual([]);
    expect(findContradictions({ q2_conditions: ['stable', 'dehydrated'] })).toEqual([]);
  });

  it('no stable, no contradiction', () => {
    expect(findContradictions({ q2_conditions: ['sensitive', 'reactive'] })).toEqual([]);
    expect(findContradictions({})).toEqual([]);
    expect(findContradictions({ q2_conditions: 'stable' })).toEqual([]);
  });
});

describe('validateAnswers', () => {
  it('reports the missing required answers of visible questions only', () => {
    const result = validateAnswers(all, {});
    expect(result.valid).toBe(false);
    expect(result.missingRequired).toEqual(['q2_conditions', 'q4_reactions']);
  });

  it('skipping optional questions is fine', () => {
    const result = validateAnswers(all, { q2_conditions: ['dehydrated'], q4_reactions: ['acids'] });
    expect(result.valid).toBe(true);
    expect(result.missingRequired).toEqual([]);
  });

  it('a contradiction does not make the answers invalid', () => {
    const result = validateAnswers(all, {
      q2_conditions: ['stable', 'sensitive'],
      q4_reactions: ['acids'],
    });
    expect(result.valid).toBe(true);
    expect(result.contradictions).toHaveLength(1);
  });

  it('a required question that is hidden is not required', () => {
    const hidden = question('h', { required: true, showIf: { questionId: 'p', anyOf: ['a'] } });
    expect(validateAnswers([question('p'), hidden], {}).valid).toBe(true);
    expect(validateAnswers([question('p'), hidden], { p: 'a' }).missingRequired).toEqual(['h']);
  });

  it('rejects an unknown option', () => {
    const result = validateAnswers([conditions], { q2_conditions: ['purple'] });
    expect(result.invalid).toEqual([{ questionId: 'q2_conditions', reason: 'unknown_option' }]);
  });

  it('rejects a wrong answer type', () => {
    expect(validateAnswers([conditions], { q2_conditions: 'stable' }).invalid[0]?.reason).toBe(
      'wrong_type',
    );
    expect(validateAnswers([question('s')], { s: ['a'] }).invalid[0]?.reason).toBe('wrong_type');
    expect(
      validateAnswers([question('t', { type: 'text', options: [] })], { t: ['a'] }).invalid[0]
        ?.reason,
    ).toBe('wrong_type');
  });

  it('accepts a text answer and a valid single answer', () => {
    expect(
      validateAnswers([question('t', { type: 'text', options: [] })], { t: 'free text' }).valid,
    ).toBe(true);
    expect(validateAnswers([question('s')], { s: 'a' }).valid).toBe(true);
  });

  it('rejects an unknown single option', () => {
    expect(validateAnswers([question('s')], { s: 'zzz' }).invalid[0]?.reason).toBe(
      'unknown_option',
    );
  });

  it('rejects a repeated option and an exclusive option combined with others', () => {
    expect(
      validateAnswers([conditions], { q2_conditions: ['stable', 'stable'] }).invalid[0]?.reason,
    ).toBe('duplicate_option');
    expect(
      validateAnswers([reactions], { q4_reactions: ['acids', 'none_noticed'] }).invalid[0]?.reason,
    ).toBe('exclusive_conflict');
  });

  it('an exclusive option alone is valid', () => {
    expect(validateAnswers([reactions], { q4_reactions: ['none_noticed'] }).valid).toBe(true);
  });
});
