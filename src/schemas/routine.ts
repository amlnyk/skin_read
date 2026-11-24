import { z } from 'zod';
import { LIMITS, idSchema, isoDateSchema } from './common';
import { frequencySchema, productCategorySchema, slotSchema, stepStatusSchema } from './enums';

export const routineStepSchema = z.object({
  id: idSchema,
  order: z.number().int().min(0),
  category: productCategorySchema,
  productId: idSchema.optional(),
  status: stepStatusSchema,
  frequency: frequencySchema,
  note: z.string().max(LIMITS.note).optional(),
});
export type RoutineStep = z.infer<typeof routineStepSchema>;

export const routineSchema = z.object({
  id: idSchema,
  slot: slotSchema,
  steps: z.array(routineStepSchema),
});
export type Routine = z.infer<typeof routineSchema>;

// One log per day and slot: which steps were done.
export const routineLogSchema = z.object({
  date: isoDateSchema,
  slot: slotSchema,
  doneStepIds: z.array(idSchema),
});
export type RoutineLog = z.infer<typeof routineLogSchema>;
