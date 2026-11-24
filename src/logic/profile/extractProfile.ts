import {
  QUESTION_IDS,
  ageBandSchema,
  avoidPrefSchema,
  baseTypeSchema,
  careTimeSchema,
  conditionSchema,
  cycleEffectSchema,
  cyclePhaseSchema,
  cycleStatusSchema,
  goalSchema,
  productsCountSchema,
  reactionGroupSchema,
  safetyFlagSchema,
  sexSchema,
} from '@/schemas';
import type { TestAnswers } from '@/types';
import { otherTextKey } from '../test';
import type { ProfileFields } from './types';

type Enum<T extends string> = { readonly options: readonly T[] };

function chosen(answers: TestAnswers, questionId: string): string[] {
  const answer = answers[questionId];
  if (Array.isArray(answer)) return answer;
  return typeof answer === 'string' ? [answer] : [];
}

// Keeps only known values, in the order of the enum: the same answers always give the same list.
function pick<T extends string>(schema: Enum<T>, ids: readonly string[]): T[] {
  return schema.options.filter((option) => ids.includes(option));
}

function pickOne<T extends string>(schema: Enum<T>, ids: readonly string[]): T | null {
  return pick(schema, ids)[0] ?? null;
}

function text(answers: TestAnswers, questionId: string, optionId: string): string | undefined {
  const value = answers[otherTextKey(questionId, optionId)];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Copies the raw answers into the profile fields. This is the only place that reads the
 * answers about sex and cycle: the rules afterwards see them as profile fields and must not
 * let them change the type, the mode or the restrictions.
 */
export function extractProfileFields(answers: TestAnswers): ProfileFields {
  const phases = pick(cyclePhaseSchema, chosen(answers, QUESTION_IDS.cycle));
  const cycleChoice = pickOne(cycleStatusSchema, chosen(answers, QUESTION_IDS.cycle));
  // Any chosen phase means the user notices changes.
  const cycleStatus = phases.length > 0 ? 'noticed' : cycleChoice;

  const goalOtherText = text(answers, QUESTION_IDS.goals, 'other');
  const reactionOtherText = text(answers, QUESTION_IDS.reactions, 'other');

  return {
    baseType: pickOne(baseTypeSchema, chosen(answers, QUESTION_IDS.baseType)) ?? 'unsure',
    conditions: pick(conditionSchema, chosen(answers, QUESTION_IDS.conditions)),
    goals: pick(goalSchema, chosen(answers, QUESTION_IDS.goals)),
    ...(goalOtherText === undefined ? {} : { goalOtherText }),
    reactions: pick(reactionGroupSchema, chosen(answers, QUESTION_IDS.reactions)),
    ...(reactionOtherText === undefined ? {} : { reactionOtherText }),
    avoid: pick(avoidPrefSchema, chosen(answers, QUESTION_IDS.avoid)),
    sex: pickOne(sexSchema, chosen(answers, QUESTION_IDS.sex)),
    ageBand: pickOne(ageBandSchema, chosen(answers, QUESTION_IDS.ageBand)),
    cycle: {
      status: cycleStatus,
      phases,
      effects: pick(cycleEffectSchema, chosen(answers, QUESTION_IDS.cycleEffects)),
    },
    safetyFlags: pick(safetyFlagSchema, chosen(answers, QUESTION_IDS.safetyFlags)),
    careHabits: {
      productsCount: pickOne(productsCountSchema, chosen(answers, QUESTION_IDS.productsCount)),
      careTime: pickOne(careTimeSchema, chosen(answers, QUESTION_IDS.careTime)),
    },
  };
}
