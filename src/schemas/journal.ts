import { z } from 'zod';
import { LIMITS, idSchema, isoDateSchema } from './common';
import { feelingSchema, intensitySchema, journalCyclePeriodSchema } from './enums';

// Every field is optional: an entry with a single filled field is valid.
export const symptomsSchema = z.object({
  dryness: intensitySchema.optional(),
  oiliness: intensitySchema.optional(),
  redness: intensitySchema.optional(),
  sensitivity: intensitySchema.optional(),
  burning: intensitySchema.optional(),
  breakouts: intensitySchema.optional(),
  flaking: intensitySchema.optional(),
});
export type Symptoms = z.infer<typeof symptomsSchema>;

export const journalEntrySchema = z.object({
  id: idSchema,
  date: isoDateSchema,
  feeling: feelingSchema.optional(),
  symptoms: symptomsSchema,
  newProductIds: z.array(idSchema),
  shavingIrritation: intensitySchema.optional(),
  cyclePeriod: journalCyclePeriodSchema.optional(),
  note: z.string().max(LIMITS.note),
  routineChangeNote: z.string().max(LIMITS.note).optional(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;
