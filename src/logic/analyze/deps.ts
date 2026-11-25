// What the steps take from the sibling logic modules. The layer rules do not allow `../../`
// from steps/, so the steps import from here, one level up.
export { checkPair, compatSeverity, type CompatContent, type CompatSubject } from '../compat';
export { normalizeIngredients, parseInci, type InciContent } from '../inci';
export type { ProfileAnalysis } from '../profile';
