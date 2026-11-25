export { analyzeProduct } from './analyzeProduct';
export {
  coverageOfComposition,
  needsComposition,
  prepareComposition,
  resolveComposition,
  type PreparedComposition,
  type ProductCoverage,
} from './composition';
export {
  appendText,
  compositionText,
  confirmPosition,
  removePosition,
  replacePosition,
} from './editComposition';
export { groupName, ingredientName } from './names';
export { markReaction, type ReactionMarked } from './reactions';
export { groupsForAvoid, groupsForReaction } from './groupMap';
export { ingredientsOfText, personalRestrictions } from './steps/personalRestrictions';
export { preferenceMismatches } from './steps/preferences';
export type { LimitationCode } from './steps/limitations';
export type { AnalyzeContent, AnalyzeInput, Composition, Draft } from './types';
export { isPossible, isRecognized } from './types';
