import { z } from 'zod';
import { reviewStatusSchema } from './enums';

// Length limits (also the security limits from the plan: name 120, composition 10 000, note 2 000).
export const LIMITS = {
  id: 100,
  name: 120,
  inciRaw: 10_000,
  note: 2_000,
  otherText: 300,
  shortText: 500,
  longText: 5_000,
} as const;

export const idSchema = z.string().min(1).max(LIMITS.id);

// Dates are stored as ISO strings only (never Date objects).
export const isoDateTimeSchema = z.iso.datetime();
export const isoDateSchema = z.iso.date();
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

// Every content record has an id, a source and a review status.
export const contentMetaShape = {
  id: idSchema,
  source: z.string().min(1).max(LIMITS.shortText),
  reviewStatus: reviewStatusSchema,
};
