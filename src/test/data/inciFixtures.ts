import { z } from 'zod';
import compositionsRaw from '@fixtures/compositions.json';
import contentRaw from '@fixtures/inci-content.json';
import {
  compatibilityRuleSchema,
  ingredientGroupSchema,
  ingredientSchema,
  type CompatibilityRule,
  type Ingredient,
  type IngredientGroup,
} from '@/schemas';

// Invented content and compositions for the tests of the INCI parser and the compatibility
// engine (tests/fixtures/inci-content.json, compositions.json). It is NOT cosmetology content:
// the real compat-rules.json has no rules until the cosmetologist gives them.

const contentSchema = z.object({
  ingredients: z.array(ingredientSchema),
  ingredientGroups: z.array(ingredientGroupSchema),
  compatRules: z.array(compatibilityRuleSchema),
});

export type InciFixtureContent = {
  ingredients: Ingredient[];
  ingredientGroups: IngredientGroup[];
  compatRules: CompatibilityRule[];
};

export const inciContent: InciFixtureContent = contentSchema.parse(contentRaw);

const compositionsSchema = z.object({
  F1: z.string(),
  F2: z.string(),
  F3: z.string(),
  F4: z.string(),
  F5: z.string(),
  F6: z.string(),
  F7: z.string(),
});

export const compositions = compositionsSchema.parse(compositionsRaw);

/** A copy of the fixture content without some rules (to test "no rule"). */
export function withoutRules(ids: readonly string[]): InciFixtureContent {
  return {
    ...inciContent,
    compatRules: inciContent.compatRules.filter((rule) => !ids.includes(rule.id)),
  };
}
