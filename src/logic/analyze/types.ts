import type {
  CompatibilityRule,
  Ingredient,
  IngredientGroup,
  Observation,
  ParsedIngredient,
  Product,
  Routine,
  SkinProfile,
} from '@/types';
import type { ProfileAnalysis } from '../profile';

/** What the analysis reads from the content. */
export type AnalyzeContent = {
  readonly ingredients: readonly Ingredient[];
  readonly ingredientGroups: readonly IngredientGroup[];
  readonly compatRules: readonly CompatibilityRule[];
};

export type AnalyzeInput = {
  /** The id of the new result. The logic has no random numbers, so the caller brings it. */
  id: string;
  product: Product;
  profile: SkinProfile;
  /** The analysis of the saved profile (restrictions and medical notes). */
  analysis: Pick<ProfileAnalysis, 'restrictions' | 'minorMode'>;
  /** The routine of the profile: both slots. */
  routines: readonly Routine[];
  /** The products of the collection, to find the products the routine steps point to. */
  products: readonly Product[];
  content: AnalyzeContent;
  /** The time of the check in milliseconds (the logic has no clock). */
  now: number;
};

/** An observation before the final order gives it an id. */
export type Draft = Omit<Observation, 'id'>;

/** The composition of the product as the analysis sees it. */
export type Composition = {
  /** Every position, recognised or not, in the order of the label. */
  ingredients: ParsedIngredient[];
  /** The raw text of the positions that were not recognised. */
  unknown: string[];
};

/** A position that rests on a fuzzy match nobody confirmed: only a "possible match". */
export function isPossible(item: ParsedIngredient): boolean {
  return item.matchType === 'fuzzy' && !item.confirmed;
}

/** A position the analysis may call recognised (known and not waiting for a confirmation). */
export function isRecognized(item: ParsedIngredient): boolean {
  return item.matchType !== 'unknown' && !isPossible(item);
}

export function newDraft(partial: Partial<Draft> & Pick<Draft, 'kind'>): Draft {
  return {
    ingredientIds: [],
    ruleId: null,
    messageId: null,
    key: null,
    via: null,
    groupIds: [],
    productIds: [],
    slot: null,
    possible: false,
    ...partial,
  };
}
