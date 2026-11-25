import { z } from 'zod';
import { idSchema } from './common';
import { observationKindSchema, observationSeveritySchema } from './enums';

// One finding about the whole routine (stage 9). Like the observations of a product check it
// carries no text: the screen writes the words from the template (templateId) and the content
// records the ids point to.
//
// `params` holds lists of ids and keys, never sentences. The keys in use:
//   slots        'am' | 'pm'           where the finding stands
//   categories   product categories    for a missing base step
//   ingredients  ingredient ids        what the finding is about
//   groups       ingredient group ids  the same, for groups
//   keys         reaction groups, preferences, medical notes, limits (what the finding is about)
//   conditions   skin conditions and reaction groups that raised a conflict for this profile
export const routineObservationSchema = z.object({
  id: idSchema,
  kind: observationKindSchema,
  severity: observationSeveritySchema,
  templateId: idSchema,
  params: z.record(z.string(), z.array(z.string())),
  relatedProductIds: z.array(idSchema),
  ruleId: idSchema.optional(),
});
export type RoutineObservation = z.infer<typeof routineObservationSchema>;
