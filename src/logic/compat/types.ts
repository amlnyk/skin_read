import type {
  CompatibilityRule,
  CompatStatus,
  Condition,
  Ingredient,
  IngredientGroup,
  ReactionGroup,
  Slot,
} from '@/schemas';

/** One side of a check: a base ingredient or a whole group. */
export type CompatSubject = {
  kind: 'ingredient' | 'group';
  id: string;
  /** When the component is used. Not set: the slot of the context, or unknown. */
  slots?: readonly Slot[];
};

export type CompatProfile = {
  conditions: readonly Condition[];
  reactions: readonly ReactionGroup[];
};

export type CompatContext = {
  /** The slot the check is made for. Not set: unknown. */
  slot?: Slot | null;
  /** The saved profile. Not set: no personal escalation. */
  profile?: CompatProfile | null;
};

export type CompatContent = {
  readonly ingredients: readonly Ingredient[];
  readonly ingredientGroups: readonly IngredientGroup[];
  readonly compatRules: readonly CompatibilityRule[];
};

/** Why the result is what it is. The UI turns the code into text, the logic never writes text. */
export type CompatReason =
  'rule_caution' | 'rule_escalated' | 'rule_info' | 'no_rule' | 'other_slots' | 'unknown_subject';

export type ConditionNote = {
  kind: 'condition' | 'reaction';
  value: Condition | ReactionGroup;
};

export type CompatResult = {
  status: CompatStatus;
  reason: CompatReason;
  a: CompatSubject;
  b: CompatSubject;
  ruleId: string | null;
  /** The text of the rule. null: the text is not written yet (the UI says "Інформація готується"). */
  explanation: string | null;
  timingAdvice: string | null;
  /** The profile values that raised the caution to "not_recommended_for_profile". */
  conditionNotes: ConditionNote[];
  /** Subjects that are not in the content (for "unknown_subject"). */
  unknownSubjects: CompatSubject[];
  source: string | null;
  reviewStatus: CompatibilityRule['reviewStatus'] | null;
};
