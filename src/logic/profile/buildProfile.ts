import type { ContentBundle, SkinProfile, TestAnswers } from '@/types';
import { evaluateSafety } from '../safety';
import { findContradictions } from '../test';
import { extractProfileFields } from './extractProfile';
import { RULES } from './rules';
import type { AnalysisDraft } from './ruleTypes';
import type { ProfileAnalysis, ProfileIdentity } from './types';

function emptyDraft(): AnalysisDraft {
  return {
    mode: null,
    restrictions: { reactions: [], avoid: [], medicalNotes: [] },
    typeBlocks: [],
    conditionBlocks: [],
    notes: [],
    minorMode: false,
  };
}

/**
 * Builds the skin profile and its analysis from the raw answers. No language model, no clock,
 * no randomness: the same answers, content and arguments always give the same result.
 *
 * `now` is the time in milliseconds; the id, the revision and the creation date come from
 * the caller (the store knows the previous profile, logic does not).
 * The profile is a proposal: it reaches the store only after the user confirms it.
 */
export function buildProfile(
  answers: TestAnswers,
  content: ContentBundle,
  now: number,
  identity: ProfileIdentity,
): { profile: SkinProfile; analysis: ProfileAnalysis } {
  const fields = extractProfileFields(answers);
  const safety = evaluateSafety(answers);
  const contradictions = findContradictions(answers);

  // The rules run from the strongest priority to the weakest; a weaker rule cannot undo a stronger one.
  const draft = emptyDraft();
  for (const rule of RULES) rule.apply({ fields, safety, contradictions, content }, draft);

  const analysis: ProfileAnalysis = {
    mode: draft.mode ?? 'standard',
    contradictions,
    restrictions: draft.restrictions,
    textBlocks: [...draft.typeBlocks, ...draft.conditionBlocks],
    notes: draft.notes,
    minorMode: draft.minorMode,
  };

  const profile: SkinProfile = {
    ...fields,
    id: identity.id,
    revision: identity.revision,
    contradictions: contradictions.map((item) => item.id),
    createdAt: identity.createdAt,
    updatedAt: new Date(now).toISOString(),
  };

  return { profile, analysis };
}
