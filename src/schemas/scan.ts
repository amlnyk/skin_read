import { z } from 'zod';
import { LIMITS, idSchema, isoDateTimeSchema } from './common';
import {
  goalSchema,
  matchTypeSchema,
  observationKindSchema,
  scanStatusSchema,
  slotSchema,
} from './enums';
import { productSchema } from './product';

// One recognised (or not recognised) position of the composition, as the check saw it.
export const matchedIngredientSchema = z.object({
  raw: z.string().min(1).max(LIMITS.shortText),
  position: z.number().int().min(0).default(0),
  // null: the name is known only as a member of a group (a "group_pattern" match)
  ingredientId: idSchema.nullable(),
  groupIds: z.array(idSchema).default([]),
  matchType: matchTypeSchema,
  // false: a fuzzy match nobody confirmed. It is a "possible match", never a fact.
  confirmed: z.boolean().default(true),
});
export type MatchedIngredient = z.infer<typeof matchedIngredientSchema>;

// An observation never carries text: the screen writes the text from the kind and the keys
// (and from the content records that ruleId, ingredientIds and groupIds point to).
export const observationSchema = z.object({
  id: idSchema,
  kind: observationKindSchema,
  ingredientIds: z.array(idSchema),
  ruleId: idSchema.nullable(),
  messageId: idSchema.nullable(),
  // the value the observation is about: a reaction group, a preference, a condition, a
  // medical note or a limitation code (see logic/analyze)
  key: z.string().max(LIMITS.id).nullable().default(null),
  // how a personal restriction was found: by a group, by a marked ingredient, by the free text
  via: z.enum(['group', 'ingredient', 'text']).nullable().default(null),
  groupIds: z.array(idSchema).default([]),
  // other products of the routine the observation is about
  productIds: z.array(idSchema).default([]),
  slot: slotSchema.nullable().default(null),
  // true: it rests on a fuzzy match nobody confirmed ("possible match")
  possible: z.boolean().default(false),
});
export type Observation = z.infer<typeof observationSchema>;

export const benefitSchema = z.object({
  ingredientId: idSchema,
  goal: goalSchema,
});
export type Benefit = z.infer<typeof benefitSchema>;

export const coverageSchema = z.object({
  total: z.number().int().min(0),
  recognized: z.number().int().min(0),
  unknownRatio: z.number().min(0).max(1),
  isSufficient: z.boolean(),
});

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
  // what is missing for the analysis and the limits of it (always at least "not a guarantee")
  insufficientInfo: z.array(observationSchema),
  // potential benefits: ingredient.supports that match the goals (content only)
  benefits: z.array(benefitSchema).default([]),
  coverage: coverageSchema.default({
    total: 0,
    recognized: 0,
    unknownRatio: 0,
    isSufficient: false,
  }),
  // the profile revision the check was made for; a newer profile makes the result "old"
  profileRevision: z.number().int().min(1),
});
export type ScanResult = z.infer<typeof scanResultSchema>;
