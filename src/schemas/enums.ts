import { z } from 'zod';

// Single source of truth for enums (the "value dictionary" from CLAUDE.md).
// Types are derived with z.infer; do not duplicate them by hand.

// ---- Content ----
export const contentPolicySchema = z.enum(['demo', 'public']);
export type ContentPolicy = z.infer<typeof contentPolicySchema>;

export const reviewStatusSchema = z.enum(['verified', 'draft', 'placeholder']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

// ---- Profile ----
export const baseTypeSchema = z.enum(['oily', 'dry', 'normal', 'unsure']);
export type BaseType = z.infer<typeof baseTypeSchema>;

export const conditionSchema = z.enum([
  'dehydrated',
  'sensitive',
  'reactive',
  'combination',
  'breakouts',
  'pigmentation',
  'aging_signs',
  'stable',
]);
export type Condition = z.infer<typeof conditionSchema>;

export const goalSchema = z.enum([
  'reduce_breakouts',
  'hydrate',
  'reduce_oiliness',
  'even_tone',
  'anti_aging',
  'maintain_healthy',
  'other',
]);
export type Goal = z.infer<typeof goalSchema>;

// none_noticed and unknown are exclusive with everything else (checked in the profile schema).
export const reactionGroupSchema = z.enum([
  'acids',
  'retinoids',
  'fragrance_essential_oils',
  'preservatives_alcohol',
  'other',
  'none_noticed',
  'unknown',
]);
export type ReactionGroup = z.infer<typeof reactionGroupSchema>;

// `none` is exclusive with everything else (checked in the profile schema).
export const avoidPrefSchema = z.enum([
  'silicones',
  'sulfates',
  'parabens',
  'fragrance_essential_oils',
  'alcohol',
  'comedogenic_oils',
  'none',
]);
export type AvoidPref = z.infer<typeof avoidPrefSchema>;

// "Skipped" is represented by null where the field is nullable.
export const sexSchema = z.enum(['female', 'male', 'other_or_undisclosed']);
export type Sex = z.infer<typeof sexSchema>;

export const ageBandSchema = z.enum(['under_18', '18_24', '25_34', '35_plus']);
export type AgeBand = z.infer<typeof ageBandSchema>;

export const cycleStatusSchema = z.enum([
  'noticed',
  'not_noticed',
  'unsure',
  'not_relevant',
  'declined',
]);
export type CycleStatus = z.infer<typeof cycleStatusSchema>;

export const cyclePhaseSchema = z.enum(['pre_menstrual', 'during_menstrual', 'other_phase']);
export type CyclePhase = z.infer<typeof cyclePhaseSchema>;

export const cycleEffectSchema = z.enum([
  'more_breakouts',
  'oilier',
  'more_sensitive',
  'dry_tight',
  'redness',
  'other',
]);
export type CycleEffect = z.infer<typeof cycleEffectSchema>;

export const productsCountSchema = z.enum(['none', '1_2', '3_4', '5_plus']);
export type ProductsCount = z.infer<typeof productsCountSchema>;

export const careTimeSchema = z.enum([
  'none',
  'morning_only',
  'evening_only',
  'morning_evening',
  'occasionally',
]);
export type CareTime = z.infer<typeof careTimeSchema>;

export const safetyFlagSchema = z.enum([
  'strong_or_prolonged_reaction',
  'painful_swelling_or_burning',
  'prescribed_derm_treatment',
  'pregnancy_or_planning',
  'other_limits',
]);
export type SafetyFlag = z.infer<typeof safetyFlagSchema>;

export const emergencyFlagSchema = z.enum(['breathing_difficulty', 'lip_or_tongue_swelling']);
export type EmergencyFlag = z.infer<typeof emergencyFlagSchema>;

export const modeSchema = z.enum(['emergency', 'see_doctor', 'barrier_first', 'standard']);
export type Mode = z.infer<typeof modeSchema>;

// ---- Care ----
export const productCategorySchema = z.enum([
  'cleanser',
  'moisturizer',
  'sunscreen',
  'serum',
  'toner_essence',
  'exfoliant',
  'mask',
  'eye_cream',
  'spot_treatment',
  'other',
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const slotSchema = z.enum(['am', 'pm']);
export type Slot = z.infer<typeof slotSchema>;

export const frequencySchema = z.enum([
  'daily',
  'every_other_day',
  'one_two_per_week',
  'as_needed',
]);
export type Frequency = z.infer<typeof frequencySchema>;

// The answer to "Do you already have a care routine?" (stage 5).
export const scenarioSchema = z.enum(['none', 'have', 'partial', 'skipped']);
export type Scenario = z.infer<typeof scenarioSchema>;

export const stepStatusSchema = z.enum(['owned', 'to_choose', 'optional', 'needs_check']);
export type StepStatus = z.infer<typeof stepStatusSchema>;

export const compatStatusSchema = z.enum([
  'no_known_conflicts',
  'caution',
  'not_recommended_for_profile',
  'insufficient_info',
]);
export type CompatStatus = z.infer<typeof compatStatusSchema>;

export const scanStatusSchema = z.enum([
  'may_fit',
  'caution',
  'personal_warnings',
  'insufficient_info',
]);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export const matchTypeSchema = z.enum(['exact', 'alias', 'group_pattern', 'fuzzy', 'unknown']);
export type MatchType = z.infer<typeof matchTypeSchema>;

export const observationKindSchema = z.enum([
  'missing_base_step',
  'conflict',
  'duplicate_active',
  'many_actives_in_slot',
  'personal_restriction',
  'ingredient_caution',
  'preference_mismatch',
  'incomplete_data',
  'doctor_note',
]);
export type ObservationKind = z.infer<typeof observationKindSchema>;

// How much attention an observation of the whole routine asks for. It is a degree of emphasis on
// the screen (words and shapes, never a score): there are no numbers in the routine analysis.
export const observationSeveritySchema = z.enum(['info', 'attention', 'important']);
export type ObservationSeverity = z.infer<typeof observationSeveritySchema>;

export const intensitySchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export type Intensity = z.infer<typeof intensitySchema>;

// ---- Journal and needs (values taken from the stage 10 and 7 task texts) ----
export const feelingSchema = z.enum(['good', 'so_so', 'bad']);
export type Feeling = z.infer<typeof feelingSchema>;

// Proposed: the CLAUDE.md dictionary has only three cycle phases; the journal task also lists
// "after" and "don't know / don't track". Pending confirmation (see docs/architecture/decisions.md).
export const journalCyclePeriodSchema = z.enum([
  'pre_menstrual',
  'during_menstrual',
  'post_menstrual',
  'other_phase',
  'unknown',
]);
export type JournalCyclePeriod = z.infer<typeof journalCyclePeriodSchema>;

export const needPrioritySchema = z.enum(['base', 'missing', 'optional', 'not_now']);
export type NeedPriority = z.infer<typeof needPrioritySchema>;
