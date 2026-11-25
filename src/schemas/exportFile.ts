import { z } from 'zod';
import { isoDateTimeSchema } from './common';
import { persistedStateSchema } from './persisted';

/** The `app` field of every export file. */
export const EXPORT_APP = 'skin-barrier';

// The file the user downloads from "Data" and can bring back later:
// { app, schemaVersion, exportedAt, data }. `data` is exactly what the app saves on the device.
// zod drops every field that is not listed here (nothing from the file is trusted blindly).
export const exportFileSchema = z.object({
  app: z.literal(EXPORT_APP),
  schemaVersion: z.number().int().min(1),
  exportedAt: isoDateTimeSchema,
  data: persistedStateSchema,
});
export type ExportFile = z.infer<typeof exportFileSchema>;
