import { z } from 'zod';
import { isoDateTimeSchema, timeOfDaySchema } from './common';

const reminderSchema = z.object({
  enabled: z.boolean(),
  // "HH:MM", null until the user picks a time
  time: timeOfDaySchema.nullable(),
});

export const settingsSchema = z.object({
  consents: z.object({
    photoToAi: z.object({
      granted: z.boolean(),
      at: isoDateTimeSchema.nullable(),
    }),
  }),
  reminders: z.object({
    am: reminderSchema,
    pm: reminderSchema,
    journal: reminderSchema,
  }),
  cycleTrackingVisible: z.boolean(),
  showShavingField: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;
