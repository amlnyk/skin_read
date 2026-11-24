import { z } from 'zod';
import { LIMITS, idSchema, isoDateSchema } from './common';
import {
  frequencySchema,
  productCategorySchema,
  scenarioSchema,
  slotSchema,
  stepStatusSchema,
} from './enums';

// A step keeps only what the user can change. The purpose, the components to look for and the
// personal warnings are not saved: they are calculated from the content and the profile
// every time (logic/routine explainStep), so a new profile or new content never leaves old texts.
export const routineStepSchema = z.object({
  id: idSchema,
  order: z.number().int().min(0),
  category: productCategorySchema,
  productId: idSchema.optional(),
  // the content record of an optional step (routine-steps.json), when the step came from one
  contentId: idSchema.optional(),
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

// What the user said about the care they already have, and for which profile the routine was built.
export const careSetupSchema = z.object({
  scenario: scenarioSchema.nullable(),
  // used for the scenarios "have" and "partial"; empty otherwise
  ownedCategories: z.array(productCategorySchema),
  // revision of the profile the routine was built for; null while there is no routine
  builtForRevision: z.number().int().min(1).nullable(),
});
export type CareSetup = z.infer<typeof careSetupSchema>;
