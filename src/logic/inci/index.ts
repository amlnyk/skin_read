export { normalizeText } from './normalizeText';
export {
  categoriesOf,
  ingredientsOfGroup,
  searchGroups,
  searchIngredients,
  ungroupedIngredients,
  type SearchOptions,
} from './searchIngredients';
export { levenshtein } from './levenshtein';
export { parseInci } from './parseInci';
export { compilePattern, normalizeIngredients, type InciContent } from './normalizeIngredients';
export { coverage } from './coverage';
export type {
  Coverage,
  MatchedItem,
  NormalizeResult,
  ParsedItem,
  ParseResult,
  ParseWarningCode,
  UnknownItem,
} from './types';
