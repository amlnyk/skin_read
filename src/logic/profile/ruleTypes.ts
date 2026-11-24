import type { ContentBundle, Mode } from '@/types';
import type { SafetyResult } from '../safety';
import type { Contradiction } from '../test';
import type { ProfileFields, ProfileNote, Restrictions, TextBlockRef } from './types';

/** Everything a rule may look at. Rules read, they never change the context. */
export type RuleContext = {
  readonly fields: ProfileFields;
  readonly safety: SafetyResult;
  readonly contradictions: readonly Contradiction[];
  readonly content: ContentBundle;
};

/** What the rules fill in, in order of priority. */
export type AnalysisDraft = {
  mode: Mode | null;
  restrictions: Restrictions;
  typeBlocks: TextBlockRef[];
  conditionBlocks: TextBlockRef[];
  notes: ProfileNote[];
  minorMode: boolean;
};

/**
 * Priorities come from the spec (section 10), 1 is the strongest:
 * 1 danger signs, 2 allergies, reactions and medical limits, 3 irritation and the barrier,
 * 4 current conditions, 5 base type, 6 goals, 7 preferences.
 */
export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Rule = {
  readonly id: string;
  readonly priority: Priority;
  apply(context: RuleContext, draft: AnalysisDraft): void;
};

/** A stronger rule has already chosen the mode: a weaker one must not override it. */
export function setModeIfFree(draft: AnalysisDraft, mode: Mode): void {
  if (draft.mode === null) draft.mode = mode;
}

export function addNote(draft: AnalysisDraft, note: ProfileNote): void {
  if (!draft.notes.includes(note)) draft.notes.push(note);
}
