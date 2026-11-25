import type { Product, Routine, ScanResult, SkinProfile } from '@/types';
import type { ProfileAnalysis } from '../profile';
import type { AnalyzeContent } from '../analyze';

/** What the user typed about the prices. Nothing here is looked up or guessed. */
export type PriceInput = {
  a: number | null;
  b: number | null;
  /** Chosen by the user ("UAH", "грн", "€"): the app has no default currency. */
  currency: string | null;
};

export type CompareInput = {
  a: Product;
  b: Product;
  prices?: PriceInput;
  /** The ids of the two analysis results. The logic has no random numbers, so the caller brings them. */
  idA: string;
  idB: string;
  profile: SkinProfile;
  analysis: Pick<ProfileAnalysis, 'restrictions' | 'minorMode'>;
  /** The routine of the profile (both slots) and the products of the collection. */
  routines: readonly Routine[];
  products: readonly Product[];
  content: AnalyzeContent;
  now: number;
};

export type Similarity =
  'likely_similar_function' | 'partially' | 'different' | 'insufficient_info';

export type PriceDifference = {
  /** Always positive, rounded to cents. */
  amount: number;
  currency: string;
  cheaper: 'a' | 'b' | 'equal';
};

export type CompareResult = {
  sameCategory: boolean;
  /** Groups both products have (recognised positions only), and the ones only one has. */
  sharedGroupIds: string[];
  onlyAGroupIds: string[];
  onlyBGroupIds: string[];
  /** The shared groups the content marks as "active" (`active: true`). */
  sharedActiveGroupIds: string[];
  sharedIngredientIds: string[];
  onlyAIngredientIds: string[];
  onlyBIngredientIds: string[];
  a: ScanResult;
  b: ScanResult;
  /** Only when the user typed both prices and a currency. Without them the field is absent, never 0. */
  priceDifference?: PriceDifference;
  similarity: Similarity;
};
