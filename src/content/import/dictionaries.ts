import type { Dictionaries } from './importSheets';

// The words the cosmetologist may use for skin states, goals and reactions: the ids and the
// labels the person sees in the test (questionnaire.json), plus the names of the states
// (conditions.json). Built from the raw files, so the import works without zod.

type RawOption = { id: string; label?: string };
type RawQuestion = { id: string; options?: RawOption[] };
type RawCondition = { condition: string; nameUk: string | null };

// "none noticed" and "don't know" are answers, not reactions a rule could react to
const NOT_A_REACTION = new Set(['none_noticed', 'unknown']);

export function buildDictionaries(questionnaire: unknown, conditions: unknown): Dictionaries {
  const questions = (questionnaire as { items?: RawQuestion[] }).items ?? [];
  const states = (conditions as { items?: RawCondition[] }).items ?? [];
  const options = (id: string) => questions.find((question) => question.id === id)?.options ?? [];
  const labels = (option: RawOption) => (option.label ? [option.label] : []);

  return {
    conditions: options('q2_conditions').map((option) => ({
      id: option.id,
      labels: [
        ...labels(option),
        ...states
          .filter((state) => state.condition === option.id && state.nameUk)
          .map((state) => state.nameUk as string),
      ],
    })),
    goals: options('q3_goals').map((option) => ({ id: option.id, labels: labels(option) })),
    reactions: options('q4_reactions')
      .filter((option) => !NOT_A_REACTION.has(option.id))
      .map((option) => ({ id: option.id, labels: labels(option) })),
  };
}
