import type { Contradiction } from '../test';
import type {
  AvoidPref,
  BaseType,
  Condition,
  Mode,
  ReactionGroup,
  SafetyFlag,
  SkinProfile,
} from '@/types';

/** The part of the profile that comes from the answers (the rest is identity and dates). */
export type ProfileFields = Omit<
  SkinProfile,
  'id' | 'revision' | 'contradictions' | 'reactionIngredients' | 'createdAt' | 'updatedAt'
>;

/** Who the profile belongs to; the caller owns ids and dates (logic has no clock). */
export type ProfileIdentity = {
  id: string;
  /** Already incremented by the caller: 1 for the first confirmed profile. */
  revision: number;
  createdAt: string;
  /** Ingredients the user reported a reaction to: a new test does not forget them. */
  reactionIngredients?: readonly string[];
};

/**
 * A reference to a content record that explains the type or a condition.
 * `contentId` is null when the content has no text for it yet: the screen shows
 * "Інформація готується" and never invents a text.
 */
export type TextBlockRef =
  | { kind: 'skin_type'; key: BaseType; contentId: string | null }
  | { kind: 'condition'; key: Condition; contentId: string | null };

/** Service notes: ids only, the interface texts live in src/i18n. */
export type ProfileNote = 'type_unsure_retest' | 'combination_text_pending' | 'suggest_cycle_diary';

export type Restrictions = {
  reactions: ReactionGroup[];
  avoid: AvoidPref[];
  medicalNotes: SafetyFlag[];
};

export type ProfileAnalysis = {
  mode: Mode;
  contradictions: Contradiction[];
  restrictions: Restrictions;
  textBlocks: TextBlockRef[];
  notes: ProfileNote[];
  minorMode: boolean;
};
