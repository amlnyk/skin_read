import type { Question } from '@/types';

// Small questionnaire for the unit tests of this module. Same shape as questionnaire.json.

export function option(id: string, extra: Partial<Question['options'][number]> = {}) {
  return {
    id,
    label: id,
    description: null,
    exclusive: false,
    proposed: false,
    hasText: false,
    ...extra,
  };
}

export function question(id: string, extra: Partial<Question> = {}): Question {
  return {
    id,
    source: 'test',
    reviewStatus: 'draft',
    type: 'single',
    text: id,
    description: null,
    required: false,
    options: [option('a'), option('b')],
    showIf: null,
    ...extra,
  };
}

export const conditions = question('q2_conditions', {
  type: 'multi',
  required: true,
  options: ['dehydrated', 'sensitive', 'reactive', 'breakouts', 'stable'].map((id) => option(id)),
});

export const reactions = question('q4_reactions', {
  type: 'multi',
  required: true,
  options: [
    option('acids'),
    option('retinoids'),
    option('other', { hasText: true }),
    option('none_noticed', { exclusive: true }),
    option('unknown', { exclusive: true }),
  ],
});

export const cycle = question('q6_1_cycle', {
  type: 'multi',
  options: [
    option('pre_menstrual'),
    option('during_menstrual'),
    option('not_relevant', { exclusive: true }),
  ],
});

export const effects = question('q6_1_effects', {
  type: 'multi',
  options: [option('oilier'), option('other', { hasText: true })],
  showIf: { questionId: 'q6_1_cycle', anyOf: ['pre_menstrual', 'during_menstrual'] },
});

export const all: Question[] = [conditions, reactions, cycle, effects];
