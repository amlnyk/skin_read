import { describe, expect, it } from 'vitest';
import { applySelection, otherTextKey, pruneHiddenAnswers } from '../selection';
import { all, conditions, cycle, question, reactions } from '../testSupport';

describe('applySelection', () => {
  it('single: the tapped option replaces the answer', () => {
    const q = question('s');
    expect(applySelection(q, undefined, 'a')).toBe('a');
    expect(applySelection(q, 'a', 'b')).toBe('b');
  });

  it('multi: toggles options on and off', () => {
    expect(applySelection(conditions, [], 'sensitive')).toEqual(['sensitive']);
    expect(applySelection(conditions, ['sensitive'], 'reactive')).toEqual([
      'sensitive',
      'reactive',
    ]);
    expect(applySelection(conditions, ['sensitive', 'reactive'], 'sensitive')).toEqual([
      'reactive',
    ]);
  });

  it('exclusive option clears everything else (question 4: retinoids, then "No")', () => {
    expect(applySelection(reactions, ['retinoids'], 'none_noticed')).toEqual(['none_noticed']);
  });

  it('any other option clears the exclusive ones (then "Acids" removes "No")', () => {
    expect(applySelection(reactions, ['none_noticed'], 'acids')).toEqual(['acids']);
  });

  it('the two exclusive options replace each other', () => {
    expect(applySelection(reactions, ['none_noticed'], 'unknown')).toEqual(['unknown']);
  });

  it('an exclusive option can be tapped off', () => {
    expect(applySelection(reactions, ['unknown'], 'unknown')).toEqual([]);
  });

  it('an option with a text field ("Other") is a normal option', () => {
    expect(applySelection(reactions, ['acids'], 'other')).toEqual(['acids', 'other']);
  });

  it('an unknown option changes nothing', () => {
    expect(applySelection(reactions, ['acids'], 'zzz')).toEqual(['acids']);
    expect(applySelection(question('s'), 'a', 'zzz')).toBe('a');
    expect(applySelection(question('s'), undefined, 'zzz')).toBe('');
  });

  it('does not change the array it was given', () => {
    const current = ['acids'];
    applySelection(reactions, current, 'retinoids');
    expect(current).toEqual(['acids']);
  });
});

describe('pruneHiddenAnswers', () => {
  it('removes the answer of a question that became hidden', () => {
    const answers = {
      q6_1_cycle: ['not_relevant'],
      q6_1_effects: ['oilier'],
      q2_conditions: ['stable'],
    };
    expect(pruneHiddenAnswers(all, answers)).toEqual({
      q6_1_cycle: ['not_relevant'],
      q2_conditions: ['stable'],
    });
  });

  it('keeps the answer of a question that is visible', () => {
    const answers = { q6_1_cycle: ['pre_menstrual'], q6_1_effects: ['oilier'] };
    expect(pruneHiddenAnswers(all, answers)).toEqual(answers);
  });

  it('keeps the text of a selected "Other" option', () => {
    const key = otherTextKey('q4_reactions', 'other');
    const answers = { q4_reactions: ['other'], [key]: 'text' };
    expect(pruneHiddenAnswers(all, answers)).toEqual(answers);
  });

  it('removes the text of an option that is not selected any more', () => {
    const key = otherTextKey('q4_reactions', 'other');
    expect(pruneHiddenAnswers(all, { q4_reactions: ['acids'], [key]: 'text' })).toEqual({
      q4_reactions: ['acids'],
    });
  });

  it('removes the text of a hidden question, together with the question', () => {
    const effectsKey = otherTextKey('q6_1_effects', 'other');
    const answers = { q6_1_cycle: ['not_relevant'], q6_1_effects: ['other'], [effectsKey]: 'x' };
    expect(pruneHiddenAnswers(all, answers)).toEqual({ q6_1_cycle: ['not_relevant'] });
  });

  it('leaves keys the questionnaire does not know alone', () => {
    expect(pruneHiddenAnswers([cycle], { somethingElse: 'x' })).toEqual({ somethingElse: 'x' });
  });

  it('builds the text key from question and option', () => {
    expect(otherTextKey('q3_goals', 'other')).toBe('q3_goals:other:text');
  });
});
