import { z } from 'zod';
import { LIMITS, idSchema, isoDateTimeSchema } from './common';

// Raw answers: question id -> chosen option id(s) or free text.
// Skipped questions have no key. The questionnaire itself arrives in content (stage 3).
export const answerValueSchema = z.union([
  z.string().max(LIMITS.shortText),
  z.array(z.string().max(LIMITS.shortText)),
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

export const testAnswersSchema = z.record(idSchema, answerValueSchema);
export type TestAnswers = z.infer<typeof testAnswersSchema>;

// Intermediate state of an unfinished test: answers so far and the current question.
export const testDraftSchema = z.object({
  answers: testAnswersSchema,
  currentQuestionId: idSchema.nullable(),
  startedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
});
export type TestDraft = z.infer<typeof testDraftSchema>;
