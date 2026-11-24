import { z } from 'zod';
import { LIMITS, idSchema, isoDateTimeSchema } from './common';
import { frequencySchema, matchTypeSchema, productCategorySchema, slotSchema } from './enums';

export const parsedIngredientSchema = z.object({
  // the item as written in the composition
  raw: z.string().min(1).max(LIMITS.shortText),
  position: z.number().int().min(0),
  // id of the matched content ingredient, null when unknown
  ingredientId: idSchema.nullable(),
  matchType: matchTypeSchema,
});
export type ParsedIngredient = z.infer<typeof parsedIngredientSchema>;

export const declaredConcentrationSchema = z.object({
  raw: z.string().min(1).max(LIMITS.shortText),
  percent: z.number().min(0).max(100),
});
export type DeclaredConcentration = z.infer<typeof declaredConcentrationSchema>;

export const compositionSourceSchema = z.enum(['photo', 'pasted', 'manual', 'unknown']);
export type CompositionSource = z.infer<typeof compositionSourceSchema>;

// Provisional shape (the plan only says "userReactions[]"): a dated free note.
export const userReactionSchema = z.object({
  at: isoDateTimeSchema,
  note: z.string().max(LIMITS.note),
});
export type UserReaction = z.infer<typeof userReactionSchema>;

export const productSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(LIMITS.name),
  brand: z.string().max(LIMITS.name).optional(),
  category: productCategorySchema,
  inciRaw: z.string().max(LIMITS.inciRaw),
  ingredients: z.array(parsedIngredientSchema),
  declaredConcentrations: z.array(declaredConcentrationSchema).optional(),
  compositionSource: compositionSourceSchema,
  slot: slotSchema.optional(),
  frequency: frequencySchema.optional(),
  userReactions: z.array(userReactionSchema),
  note: z.string().max(LIMITS.note).optional(),
  addedAt: isoDateTimeSchema,
});
export type Product = z.infer<typeof productSchema>;
