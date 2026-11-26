import type { TextBlockRef } from '@/logic/profile';
import type { SkinRecommendation } from '@/schemas';

/**
 * "Жирна або схильна до жирності" -> ["Жирна", "або схильна до жирності"] for the big title of
 * the result (Figma "result"). Names without " або " or " / " stay whole.
 */
export function splitTypeName(name: string): [string, string | null] {
  for (const separator of [' або ', ' / ']) {
    const at = name.indexOf(separator);
    if (at > 0) {
      const rest = name.slice(at + 1);
      return [name.slice(0, at), separator === ' / ' ? rest.slice(2) : rest];
    }
  }
  return [name, null];
}

/** The recommendations that belong to the type and conditions of the result, in that order. */
export function recommendationsFor(
  blocks: readonly TextBlockRef[],
  recommendations: readonly SkinRecommendation[],
): SkinRecommendation[] {
  const found: SkinRecommendation[] = [];
  for (const block of blocks) {
    for (const item of recommendations) {
      const fits =
        block.kind === 'skin_type'
          ? item.target.baseTypes.includes(block.key)
          : item.target.conditions.includes(block.key);
      if (fits && !found.includes(item)) found.push(item);
    }
  }
  return found;
}

/**
 * Chip labels "look for in the composition", without repeats. A label tied to a reaction group
 * the person reacts to is left out, and so are retinoids for a person under 18.
 */
export function lookForChips(
  recommendations: readonly SkinRecommendation[],
  reactions: readonly string[],
  minor: boolean,
): string[] {
  const labels: string[] = [];
  for (const item of recommendations) {
    for (const chip of item.lookFor) {
      if (chip.reactionGroup !== null && reactions.includes(chip.reactionGroup)) continue;
      if (minor && chip.reactionGroup === 'retinoids') continue;
      if (!labels.some((label) => label.toLowerCase() === chip.label.toLowerCase())) {
        labels.push(chip.label);
      }
    }
  }
  return labels;
}

/** Letters and digits only, lower case: "SLS / SLES" and "(SLS/SLES)" compare as the same. */
function squash(label: string): string {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Chip labels "avoid for now": the person's own restrictions first (one chip per component group,
 * even when it is both a reaction and an avoided component), then the content. A content label
 * that says the same as a chip already there ("Ефірні олії" next to "Ефірні олії й
 * ароматизатори", "SLS / SLES" next to "Сульфати (SLS/SLES)") is left out.
 */
export function avoidChips(
  restrictions: readonly string[],
  recommendations: readonly SkinRecommendation[],
): string[] {
  const labels: string[] = [];
  const seen: string[] = [];
  for (const label of [...restrictions, ...recommendations.flatMap((item) => item.avoid)]) {
    const key = squash(label);
    if (key === '' || seen.some((known) => known.includes(key) || key.includes(known))) continue;
    seen.push(key);
    labels.push(label);
  }
  return labels;
}

/** Ukrainian plural form for a count: 1 крок, 2 кроки, 5 кроків. */
export function pluralForm(count: number): 'one' | 'few' | 'many' {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'many';
  if (last === 1) return 'one';
  if (last >= 2 && last <= 4) return 'few';
  return 'many';
}
