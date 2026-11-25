// The same comparison as normalizeText in src/logic/inci (the content layer must not import
// logic). src/test/__tests__/normalizeParity.test.ts keeps the two functions equal.
export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['\u2019\u02bc\u2018`\u00b4\u2032]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
