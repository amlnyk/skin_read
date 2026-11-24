import type {
  ContentBundle,
  NeedPriority,
  Product,
  ProductCategory,
  Routine,
  RoutineStep,
  SkinProfile,
} from '@/types';
import type { ProfileAnalysis } from '../profile';
import { BASE_CATEGORIES } from './buildBaseRoutine';
import { selectOptionalSteps } from './optional';
import type { ShoppingNeedItem } from './types';
import { personalWarnings } from './warnings';

const isBase = (category: ProductCategory) => BASE_CATEGORIES.includes(category);

/**
 * The list of what to look for, in four groups (the `priority` of each item):
 * base (the user starts from scratch), missing (the user has some care and lacks a base step),
 * optional (extra steps) and not_now (candidates that are not offered, with the reason).
 *
 * It recommends characteristics, never brands. Texts and components come from the content
 * record `purposeId`; the screen shows "Інформація готується" when there is none.
 */
export function buildShoppingNeeds(
  routines: readonly Routine[],
  products: readonly Pick<Product, 'category'>[],
  profile: Pick<SkinProfile, 'goals'>,
  analysis: ProfileAnalysis,
  content: Pick<ContentBundle, 'routineSteps'>,
): ShoppingNeedItem[] {
  const warnings = personalWarnings(analysis);
  const steps: RoutineStep[] = routines.flatMap((routine) => routine.steps);

  const infoFor = (category: ProductCategory, contentId?: string) =>
    (contentId ? content.routineSteps.find((info) => info.id === contentId) : undefined) ??
    content.routineSteps.find((info) => info.kind === 'base' && info.category === category);

  const owned = new Set<ProductCategory>([
    ...steps.filter((step) => step.status === 'owned').map((step) => step.category),
    ...products.map((product) => product.category),
  ]);
  const hasSomeBase = BASE_CATEGORIES.some((category) => owned.has(category));

  const items: ShoppingNeedItem[] = [];
  const seen = new Set<string>();
  const push = (item: Omit<ShoppingNeedItem, 'personalWarnings'>) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push({ ...item, personalWarnings: warnings });
  };
  const make = (
    id: string,
    category: ProductCategory,
    priority: NeedPriority,
    contentId?: string,
  ) => {
    const info = infoFor(category, contentId);
    push({
      id,
      category,
      priority,
      purposeId: info?.id ?? null,
      componentsToLookFor: info ? [...info.lookFor] : [],
    });
  };

  // 1. Steps the user still has to choose a product for.
  for (const step of steps) {
    if (step.status === 'owned' || owned.has(step.category)) continue;
    if (step.status === 'optional') {
      make(`need-${step.contentId ?? step.category}`, step.category, 'optional', step.contentId);
    } else if (isBase(step.category)) {
      make(`need-${step.category}`, step.category, hasSomeBase ? 'missing' : 'base');
    } else {
      // the user's own extra step
      make(`need-${step.category}`, step.category, 'optional');
    }
  }

  // 2. Candidates that are not offered now, with the reason.
  const { rejected } = selectOptionalSteps(profile, analysis, content);
  const offered = new Set(steps.map((step) => step.contentId).filter(Boolean));
  for (const { info, reason } of rejected) {
    if (offered.has(info.id)) continue;
    const id = `need-${info.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      category: info.category,
      priority: 'not_now',
      purposeId: info.id,
      componentsToLookFor: [...info.lookFor],
      personalWarnings: warnings,
      reason,
    });
  }

  return items;
}
