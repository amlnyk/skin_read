// One way to compare names everywhere in the reference and (later) in the INCI parser:
// no case, no diacritics, no apostrophes, punctuation and hyphens are plain separators.
//
// The diacritics step also folds the Ukrainian "й" into "и" and "ї" into "і". That is on
// purpose: the search forgives a typed "й" that the keyboard or a copy-paste changed.
//
// The content audit (src/content/audit.ts) has its own copy of this function, because the
// content layer must not import logic. src/test/normalizeParity.test.ts keeps both equal.

const APOSTROPHES = /['’ʼ‘`´′]/g;

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
