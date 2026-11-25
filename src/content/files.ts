import {
  conditionInfoSchema,
  disclaimerSchema,
  ingredientGroupSchema,
  ingredientSchema,
  compatibilityRuleSchema,
  observationTemplateSchema,
  productCategoryInfoSchema,
  questionSchema,
  routineStepInfoSchema,
  safetyMessageSchema,
  skinRecommendationSchema,
  skinTypeInfoSchema,
} from '@/schemas';
import type { ContentBundle } from '@/schemas';

// Registry of content files. Every container file looks like { "items": [ ... ] }.
export const CONTENT_FILES = [
  { file: 'questionnaire.json', key: 'questionnaire', schema: questionSchema },
  { file: 'skin-types.json', key: 'skinTypes', schema: skinTypeInfoSchema },
  { file: 'conditions.json', key: 'conditions', schema: conditionInfoSchema },
  { file: 'recommendations.json', key: 'recommendations', schema: skinRecommendationSchema },
  { file: 'ingredient-groups.json', key: 'ingredientGroups', schema: ingredientGroupSchema },
  { file: 'ingredients.json', key: 'ingredients', schema: ingredientSchema },
  { file: 'compat-rules.json', key: 'compatRules', schema: compatibilityRuleSchema },
  { file: 'safety-messages.json', key: 'safetyMessages', schema: safetyMessageSchema },
  { file: 'product-categories.json', key: 'productCategories', schema: productCategoryInfoSchema },
  { file: 'routine-steps.json', key: 'routineSteps', schema: routineStepInfoSchema },
  {
    file: 'observation-templates.json',
    key: 'observationTemplates',
    schema: observationTemplateSchema,
  },
] as const satisfies readonly { file: string; key: keyof ContentBundle; schema: unknown }[];

// Files with a single record (not a container). Counted by the audit, not part of the bundle.
export const SINGLE_RECORD_FILES = [{ file: 'disclaimer.json', schema: disclaimerSchema }] as const;
