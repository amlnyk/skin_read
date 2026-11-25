import type { ContentBundle, ContentPolicy, ReviewStatus } from '@/schemas';

// CONTENT_POLICY is applied here and nowhere else.
// demo   = verified + draft, public = verified only. Placeholders are never shown as real content.
export function isVisible(status: ReviewStatus, policy: ContentPolicy): boolean {
  if (status === 'verified') return true;
  if (status === 'draft') return policy === 'demo';
  return false;
}

function visible<T extends { reviewStatus: ReviewStatus }>(
  items: readonly T[],
  policy: ContentPolicy,
): T[] {
  return items.filter((item) => isVisible(item.reviewStatus, policy));
}

export function applyContentPolicy(bundle: ContentBundle, policy: ContentPolicy): ContentBundle {
  return {
    questionnaire: visible(bundle.questionnaire, policy),
    skinTypes: visible(bundle.skinTypes, policy),
    conditions: visible(bundle.conditions, policy),
    recommendations: visible(bundle.recommendations, policy),
    ingredientGroups: visible(bundle.ingredientGroups, policy),
    ingredients: visible(bundle.ingredients, policy),
    compatRules: visible(bundle.compatRules, policy),
    safetyMessages: visible(bundle.safetyMessages, policy),
    productCategories: visible(bundle.productCategories, policy),
    routineSteps: visible(bundle.routineSteps, policy),
    observationTemplates: visible(bundle.observationTemplates, policy),
  };
}
