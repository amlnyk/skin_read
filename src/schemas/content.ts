import { z } from 'zod';
import { LIMITS, contentMetaShape, idSchema } from './common';
import {
  avoidPrefSchema,
  baseTypeSchema,
  conditionSchema,
  frequencySchema,
  goalSchema,
  productCategorySchema,
  reactionGroupSchema,
  slotSchema,
} from './enums';

// Text fields are nullable on purpose: when the cosmetologist's material is missing the field
// is null and reviewStatus is 'placeholder'. The UI then shows "Інформація готується".
const text = z.string().max(LIMITS.longText).nullable();

// ---- Ingredients and groups ----
export const ingredientSchema = z.object({
  ...contentMetaShape,
  inci: z.string().min(1).max(LIMITS.shortText),
  nameUk: text,
  aliases: z.array(z.string().min(1).max(LIMITS.shortText)),
  groups: z.array(idSchema),
  category: text,
  purpose: text,
  properties: z.array(z.string().max(LIMITS.shortText)),
  cautions: z.array(z.object({ conditions: z.array(conditionSchema), text })),
  usage: text,
  knownInteractions: z.array(idSchema),
  supports: z.array(z.string().max(LIMITS.shortText)),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const ingredientGroupSchema = z.object({
  ...contentMetaShape,
  nameUk: text,
  description: text,
  // name patterns for the 'group_pattern' match type
  patterns: z.array(z.string().min(1).max(LIMITS.shortText)),
  // true: the group counts as an "active" one (duplicates and many actives in a slot are
  // looked for only among these). Not set: the cosmetologist has not decided yet.
  active: z.boolean().optional(),
});
export type IngredientGroup = z.infer<typeof ingredientGroupSchema>;

// ---- Compatibility ----
const compatRefSchema = z.object({
  kind: z.enum(['ingredient', 'group']),
  id: idSchema,
});
export type CompatRef = z.infer<typeof compatRefSchema>;

export const compatibilityRuleSchema = z.object({
  ...contentMetaShape,
  a: compatRefSchema,
  b: compatRefSchema,
  level: z.enum(['caution', 'info']),
  escalateWhen: z
    .object({
      conditions: z.array(conditionSchema),
      reactions: z.array(reactionGroupSchema),
    })
    .optional(),
  sameSlotOnly: z.boolean(),
  explanation: text,
  timingAdvice: text,
  priority: z.number().int(),
});
export type CompatibilityRule = z.infer<typeof compatibilityRuleSchema>;

// ---- Recommendations, skin types, conditions ----
export const skinRecommendationSchema = z.object({
  ...contentMetaShape,
  target: z.object({
    baseTypes: z.array(baseTypeSchema),
    conditions: z.array(conditionSchema),
  }),
  title: text,
  text,
});
export type SkinRecommendation = z.infer<typeof skinRecommendationSchema>;

export const skinTypeInfoSchema = z.object({
  ...contentMetaShape,
  baseType: baseTypeSchema.nullable(),
  nameUk: text,
  description: text,
});
export type SkinTypeInfo = z.infer<typeof skinTypeInfoSchema>;

export const conditionInfoSchema = z.object({
  ...contentMetaShape,
  condition: conditionSchema.nullable(),
  nameUk: text,
  description: text,
});
export type ConditionInfo = z.infer<typeof conditionInfoSchema>;

export const productCategoryInfoSchema = z.object({
  ...contentMetaShape,
  category: productCategorySchema.nullable(),
  nameUk: text,
  description: text,
});
export type ProductCategoryInfo = z.infer<typeof productCategoryInfoSchema>;

export const safetyMessageSchema = z.object({
  ...contentMetaShape,
  level: z.enum(['emergency', 'see_doctor', 'note']),
  text,
});
export type SafetyMessage = z.infer<typeof safetyMessageSchema>;

// ---- Questionnaire (the whole test is driven by this data) ----
export const questionOptionSchema = z.object({
  id: idSchema,
  label: text,
  description: text,
  // choosing an exclusive option clears all others (and the other way round)
  exclusive: z.boolean(),
  // not in the cosmetologist's questionnaire, added as a recommendation from the spec
  proposed: z.boolean(),
  // the option has a free text field ("Other")
  hasText: z.boolean(),
});
export type QuestionOption = z.infer<typeof questionOptionSchema>;

export const questionSchema = z.object({
  ...contentMetaShape,
  type: z.enum(['single', 'multi', 'text']),
  text,
  description: text,
  required: z.boolean(),
  options: z.array(questionOptionSchema),
  // shown only when the answer to `questionId` contains any of `anyOf`; null = always shown
  showIf: z.object({ questionId: idSchema, anyOf: z.array(idSchema).min(1) }).nullable(),
});
export type Question = z.infer<typeof questionSchema>;

// ---- Routine steps ----
// "base" records explain the base steps (cleanser, moisturizer, sunscreen): what the step is for
// and which components to look for. "optional" records are candidates for the optional step of
// the evening (or the morning); with no verified candidate the routine has no optional step.
export const routineStepInfoSchema = z.object({
  ...contentMetaShape,
  kind: z.enum(['base', 'optional']),
  category: productCategorySchema,
  // where an optional step may stand; base records leave it empty
  slots: z.array(slotSchema),
  // the name of an optional step; base steps are named by their category
  title: text,
  purpose: text,
  // how often an optional step is used; null while the cosmetologist has not given it
  frequency: frequencySchema.nullable(),
  // ids of ingredient groups to look for (a reference, checked by the content audit)
  lookFor: z.array(idSchema),
  // optional steps only: the goals that bring the step
  goals: z.array(goalSchema),
  // the reaction groups and preferences the step goes against
  reactionGroups: z.array(reactionGroupSchema),
  avoidTags: z.array(avoidPrefSchema),
  antiAging: z.boolean(),
});
export type RoutineStepInfo = z.infer<typeof routineStepInfoSchema>;

// ---- Single-record content ----
export const disclaimerSchema = z.object({
  ...contentMetaShape,
  text: z.string().min(1).max(LIMITS.longText),
});
export type Disclaimer = z.infer<typeof disclaimerSchema>;

// ---- Containers and the loaded bundle ----
export const contentBundleSchema = z.object({
  questionnaire: z.array(questionSchema),
  skinTypes: z.array(skinTypeInfoSchema),
  conditions: z.array(conditionInfoSchema),
  recommendations: z.array(skinRecommendationSchema),
  ingredientGroups: z.array(ingredientGroupSchema),
  ingredients: z.array(ingredientSchema),
  compatRules: z.array(compatibilityRuleSchema),
  safetyMessages: z.array(safetyMessageSchema),
  productCategories: z.array(productCategoryInfoSchema),
  routineSteps: z.array(routineStepInfoSchema),
});
export type ContentBundle = z.infer<typeof contentBundleSchema>;
