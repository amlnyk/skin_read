import { z } from 'zod';
import { LIMITS, idSchema, isoDateTimeSchema } from './common';
import {
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
} from './enums';

// "Exclusive" values (none_noticed, unknown, none) cannot be combined with anything else.
const reactionsSchema = z
  .array(reactionGroupSchema)
  .refine(
    (list) => !(list.includes('none_noticed') || list.includes('unknown')) || list.length === 1,
    { message: 'none_noticed and unknown cannot be combined with other reactions' },
  );

const avoidSchema = z
  .array(avoidPrefSchema)
  .refine((list) => !list.includes('none') || list.length === 1, {
    message: 'none cannot be combined with other values',
  });

export const skinProfileSchema = z.object({
  id: idSchema,
  // +1 on every confirmed change
  revision: z.number().int().min(1),
  baseType: baseTypeSchema,
  conditions: z.array(conditionSchema),
  goals: z.array(goalSchema),
  goalOtherText: z.string().max(LIMITS.otherText).optional(),
  reactions: reactionsSchema,
  reactionOtherText: z.string().max(LIMITS.otherText).optional(),
  // Ids of ingredients the user reported a reaction to (marked on a product card, stage 8).
  // Not an answer of the test: a new test keeps them.
  reactionIngredients: z.array(idSchema),
  avoid: avoidSchema,
  sex: sexSchema.nullable(),
  ageBand: ageBandSchema.nullable(),
  cycle: z.object({
    status: cycleStatusSchema.nullable(),
    phases: z.array(cyclePhaseSchema),
    effects: z.array(cycleEffectSchema),
  }),
  safetyFlags: z.array(safetyFlagSchema),
  careHabits: z.object({
    productsCount: productsCountSchema.nullable(),
    careTime: careTimeSchema.nullable(),
  }),
  // Ids of contradictions the user was asked about (provisional, see docs/decisions.md).
  contradictions: z.array(z.string().max(LIMITS.id)),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SkinProfile = z.infer<typeof skinProfileSchema>;
