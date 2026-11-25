import { z } from 'zod';

// Contracts of the serverless functions (docs/API.md). The client and the server use the same
// schemas. This file imports only `zod`: the server functions import it by a relative path.

export const API_VERSION = 1;

// What the photo may be. The server checks the real bytes, not only this declared type.
export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const imageMediaTypeSchema = z.enum(IMAGE_MEDIA_TYPES);
export type ImageMediaType = z.infer<typeof imageMediaTypeSchema>;

// After the client has shrunk the photo; the server checks the decoded size.
export const MAX_IMAGE_BYTES = 1_500_000;

// ---- POST /api/analyze-label ----
export const analyzeLabelRequestSchema = z.object({
  // base64 without the "data:" prefix
  imageBase64: z.string().min(1),
  mediaType: imageMediaTypeSchema,
});
export type AnalyzeLabelRequest = z.infer<typeof analyzeLabelRequestSchema>;

// What the model must return. Everything printed on the label is data, never instructions.
export const labelReadingSchema = z.object({
  productName: z.string().max(200).nullable(),
  brand: z.string().max(200).nullable(),
  categoryGuess: z.string().max(100).nullable(),
  ingredientsText: z.string().max(10_000).nullable(),
  language: z.string().min(1).max(16),
  confidence: z.number().min(0).max(1),
});
export type LabelReading = z.infer<typeof labelReadingSchema>;

export const analyzeLabelResponseSchema = labelReadingSchema.extend({
  apiVersion: z.literal(API_VERSION),
});
export type AnalyzeLabelResponse = z.infer<typeof analyzeLabelResponseSchema>;

// ---- Errors ----
export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'METHOD_NOT_ALLOWED',
  'ORIGIN_NOT_ALLOWED',
  'IMAGE_TOO_LARGE',
  'UNSUPPORTED_FORMAT',
  'NO_INGREDIENTS_FOUND',
  'RATE_LIMITED',
  'INTERNAL',
  'AI_BAD_RESPONSE',
  'AI_UNAVAILABLE',
  'TIMEOUT',
] as const;
export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().max(300),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
