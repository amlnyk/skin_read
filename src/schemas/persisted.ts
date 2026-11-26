import { z } from 'zod';
import { journalEntrySchema } from './journal';
import { shoppingNeedSchema } from './needs';
import { productSchema } from './product';
import { skinProfileSchema } from './profile';
import { careSetupSchema, routineLogSchema, routineSchema } from './routine';
import { scanResultSchema } from './scan';
import { settingsSchema } from './settings';
import { testDraftSchema } from './test';

// Everything that is saved to localStorage under 'skinbarrier:v1'.
// Photos never go here (localStorage is about 5 MB): they use IndexedDB at a later stage.
export const persistedStateSchema = z.object({
  // accountEmail: the local account (decision 2026-11-26). Optional, so older saves stay valid.
  // The password is never saved.
  onboarding: z.object({ completed: z.boolean(), accountEmail: z.string().max(254).optional() }),
  testDraft: testDraftSchema,
  profile: skinProfileSchema.nullable(),
  careSetup: careSetupSchema,
  routine: z.array(routineSchema),
  routineLog: z.array(routineLogSchema),
  products: z.array(productSchema),
  scans: z.array(scanResultSchema),
  journal: z.array(journalEntrySchema),
  needs: z.array(shoppingNeedSchema),
  settings: settingsSchema,
});
export type PersistedState = z.infer<typeof persistedStateSchema>;
