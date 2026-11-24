import { z } from 'zod';

// Single source of truth for enums. Types are derived with z.infer.
// More enums (skin types, conditions, goals...) arrive with the content stages.

export const contentPolicySchema = z.enum(['demo', 'public']);
export type ContentPolicy = z.infer<typeof contentPolicySchema>;

export const reviewStatusSchema = z.enum(['verified', 'draft', 'placeholder']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
