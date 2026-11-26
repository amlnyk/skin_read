import { describe, expect, it } from 'vitest';
import { all, cycle, effects, question } from '../testSupport';
import { getVisibleQuestions, isAnswered, selectedOptionIds } from '../visibility';

const ids = (list: { id: string }[]) => list.map((q) => q.id);

describe('getVisibleQuestions', () => {
  it('shows every question without a condition', () => {
    expect(ids(getVisibleQuestions(all, {}))).toEqual([
      'q2_conditions',
      'q4_reactions',
      'q6_1_cycle',
    ]);
  });

  it('"Not relevant" in 6.1 does not open the effects', () => {
    const visible = getVisibleQuestions(all, { q6_1_cycle: ['not_relevant'] });
    expect(ids(visible)).not.toContain('q6_1_effects');
  });

  it('"Yes, before menstruation" in 6.1 opens the effects, right after it', () => {
    const visible = getVisibleQuestions(all, { q6_1_cycle: ['pre_menstrual'] });
    expect(ids(visible)).toEqual(['q2_conditions', 'q4_reactions', 'q6_1_cycle', 'q6_1_effects']);
  });

  it('any of the "Yes" options is enough', () => {
    expect(ids(getVisibleQuestions(all, { q6_1_cycle: ['during_menstrual'] }))).toContain(
      'q6_1_effects',
    );
  });

  it('a question whose parent is hidden stays hidden', () => {
    const chain = [
      question('p', { showIf: { questionId: 'root', anyOf: ['a'] } }),
      question('c', { showIf: { questionId: 'p', anyOf: ['a'] } }),
    ];
    // root is not even in the list, so p is hidden, and so is c
    expect(ids(getVisibleQuestions(chain, { p: 'a' }))).toEqual([]);
  });

  it('works with a single-choice parent', () => {
    const list = [question('p'), question('c', { showIf: { questionId: 'p', anyOf: ['b'] } })];
    expect(ids(getVisibleQuestions(list, { p: 'a' }))).toEqual(['p']);
    expect(ids(getVisibleQuestions(list, { p: 'b' }))).toEqual(['p', 'c']);
  });

  it('keeps the questionnaire order', () => {
    const visible = getVisibleQuestions([effects, cycle], { q6_1_cycle: ['pre_menstrual'] });
    // effects is listed before its parent: the parent is not known yet, so it is hidden
    expect(ids(visible)).toEqual(['q6_1_cycle']);
  });
});

describe('answers helpers', () => {
  it('selectedOptionIds handles every answer shape', () => {
    expect(selectedOptionIds(undefined)).toEqual([]);
    expect(selectedOptionIds('a')).toEqual(['a']);
    expect(selectedOptionIds(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('isAnswered: empty text, empty list and no answer are not answers', () => {
    const q = question('x');
    expect(isAnswered(q, {})).toBe(false);
    expect(isAnswered(q, { x: '' })).toBe(false);
    expect(isAnswered(q, { x: '   ' })).toBe(false);
    expect(isAnswered(q, { x: [] })).toBe(false);
    expect(isAnswered(q, { x: 'a' })).toBe(true);
    expect(isAnswered(q, { x: ['a'] })).toBe(true);
  });
});

describe('getVisibleQuestions with noneOf', () => {
  const list = [question('p'), question('c', { showIf: { questionId: 'p', noneOf: ['male'] } })];

  it('hides the question when the parent answer has a noneOf option', () => {
    expect(getVisibleQuestions(list, { p: 'male' }).map((q) => q.id)).toEqual(['p']);
  });

  it('shows it for other answers and when the parent is skipped', () => {
    expect(getVisibleQuestions(list, { p: 'female' }).map((q) => q.id)).toEqual(['p', 'c']);
    expect(getVisibleQuestions(list, {}).map((q) => q.id)).toEqual(['p', 'c']);
  });
});
