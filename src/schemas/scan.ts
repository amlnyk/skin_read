import { z } from 'zod';
import { LIMITS, idSchema, isoDateTimeSchema } from './common';
import { matchTypeSchema, observationKindSchema, scanStatusSchema } from './enums';
import { productSchema } from './product';

export const matchedIngredientSchema = z.object({
  raw: z.string().min(1).max(LIMITS.shortText),
  ingredientId: idSchema,
  matchType: matchTypeSchema,
});
export type MatchedIngredient = z.infer<typeof matchedIngredientSchema>;

// An observation never carries text: the text is looked up in content by ruleId / messageId.
export const observationSchema = z.object({
  id: idSchema,
  kind: observationKindSchema,
  ingredientIds: z.array(idSchema),
  ruleId: idSchema.nullable(),
  messageId: idSchema.nullable(),
});
export type Observation = z.infer<typeof observationSchema>;

export const scanResultSchema = z.object({
  id: idSchema,
  // a copy of the product at the time of the check
  productSnapshot: productSchema,
  checkedAt: isoDateTimeSchema,
  status: scanStatusSchema,
  matched: z.array(matchedIngredientSchema),
  warnings: z.array(observationSchema),
  // composition items that were not recognised
  unknown: z.array(z.string().max(LIMITS.shortText)),
  insufficientInfo: z.array(observationSchema),
  profileRevision: z.number().int().min(1),
});
export type ScanResult = z.infer<typeof scanResultSchema>;
