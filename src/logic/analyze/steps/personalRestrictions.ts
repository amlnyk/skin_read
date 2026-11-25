import type { ParsedIngredient, ReactionGroup, SkinProfile } from '@/types';
import { normalizeIngredients, parseInci, type InciContent, type ProfileAnalysis } from '../deps';
import { groupsForReaction } from '../groupMap';
import { isPossible, newDraft, type Draft } from '../types';

// Step 2. Personal restrictions: what the person has told us they react to.
//
// Three sources, in this order (the screen keeps the order):
//   1. the reaction groups of the test ("acids"): through the group table (groupMap);
//   2. ingredients the person marked on a product card (profile.reactionIngredients);
//   3. the free text of "Other": looked up by name (exact and alias matches only).
// A match on an unconfirmed fuzzy position is still reported, but as a "possible" one: the
// careful direction. Medical notes are not restrictions: they only give a neutral note.

type Hit = { ids: string[]; groups: string[]; possible: boolean };

/** The positions that belong to any of the groups. Confirmed hits hide the possible ones. */
export function hitsInGroups(
  items: readonly ParsedIngredient[],
  groups: readonly string[],
): Hit | null {
  const confirmed: ParsedIngredient[] = [];
  const possible: ParsedIngredient[] = [];
  for (const item of items) {
    if (item.matchType === 'unknown') continue;
    if (!item.groupIds.some((id) => groups.includes(id))) continue;
    (isPossible(item) ? possible : confirmed).push(item);
  }
  const used = confirmed.length > 0 ? confirmed : possible;
  if (used.length === 0) return null;
  const ids = [...new Set(used.flatMap((item) => (item.ingredientId ? [item.ingredientId] : [])))];
  const hitGroups = [
    ...new Set(used.flatMap((item) => item.groupIds.filter((id) => groups.includes(id)))),
  ];
  return { ids, groups: hitGroups, possible: confirmed.length === 0 };
}

function byGroups(
  items: readonly ParsedIngredient[],
  reactions: readonly ReactionGroup[],
): Draft[] {
  const drafts: Draft[] = [];
  for (const reaction of reactions) {
    const hit = hitsInGroups(items, groupsForReaction(reaction));
    if (!hit) continue;
    drafts.push(
      newDraft({
        kind: 'personal_restriction',
        via: 'group',
        key: reaction,
        ingredientIds: hit.ids,
        groupIds: hit.groups,
        possible: hit.possible,
      }),
    );
  }
  return drafts;
}

function byIngredients(items: readonly ParsedIngredient[], marked: readonly string[]): Draft[] {
  const drafts: Draft[] = [];
  for (const id of marked) {
    const same = items.filter((item) => item.ingredientId === id);
    if (same.length === 0) continue;
    drafts.push(
      newDraft({
        kind: 'personal_restriction',
        via: 'ingredient',
        ingredientIds: [id],
        possible: same.every(isPossible),
      }),
    );
  }
  return drafts;
}

/** Ingredients named in the free text of "Other". Fuzzy and pattern matches are not trusted here. */
export function ingredientsOfText(text: string | undefined, content: InciContent): string[] {
  if (!text || text.trim() === '') return [];
  const { matched } = normalizeIngredients(parseInci(text).items, content);
  const ids = matched
    .filter(
      (entry) => (entry.matchType === 'exact' || entry.matchType === 'alias') && entry.ingredientId,
    )
    .map((entry) => entry.ingredientId as string);
  return [...new Set(ids)];
}

function byText(
  items: readonly ParsedIngredient[],
  text: string | undefined,
  content: InciContent,
  already: ReadonlySet<string>,
): Draft[] {
  const drafts: Draft[] = [];
  for (const id of ingredientsOfText(text, content)) {
    if (already.has(id)) continue;
    const same = items.filter((item) => item.ingredientId === id);
    if (same.length === 0) continue;
    drafts.push(
      newDraft({
        kind: 'personal_restriction',
        via: 'text',
        key: 'other',
        ingredientIds: [id],
        possible: same.every(isPossible),
      }),
    );
  }
  return drafts;
}

export function personalRestrictions(
  items: readonly ParsedIngredient[],
  profile: Pick<SkinProfile, 'reactionIngredients' | 'reactionOtherText'>,
  analysis: Pick<ProfileAnalysis, 'restrictions'>,
  content: InciContent,
): Draft[] {
  const fromGroups = byGroups(items, analysis.restrictions.reactions);
  const fromIngredients = byIngredients(items, profile.reactionIngredients);
  const marked = new Set(profile.reactionIngredients);
  const fromText = byText(items, profile.reactionOtherText, content, marked);
  return [...fromGroups, ...fromIngredients, ...fromText];
}

/** Medical notes: a neutral "talk to a doctor". It never says which ingredient is a problem. */
export function doctorNotes(analysis: Pick<ProfileAnalysis, 'restrictions'>): Draft[] {
  return analysis.restrictions.medicalNotes.map((note) =>
    newDraft({ kind: 'doctor_note', key: note }),
  );
}
