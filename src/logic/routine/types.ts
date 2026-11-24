import type {
  AvoidPref,
  NeedPriority,
  ProductCategory,
  ReactionGroup,
  Routine,
  RoutineStepInfo,
  SafetyFlag,
  Slot,
} from '@/types';

/** Something from the profile that the user must keep in mind at a step. Ids only: texts live in the UI. */
export type PersonalWarning =
  | { kind: 'reaction'; key: ReactionGroup }
  | { kind: 'avoid'; key: AvoidPref }
  | { kind: 'medical'; key: SafetyFlag };

/** Service notes of the routine; the interface texts live in src/i18n. */
export type RoutineNote =
  // a doctor has prescribed a treatment: the routine follows the doctor's scheme
  | 'follow_doctor_scheme'
  // the mode or a medical limit means that no extra step is offered now
  | 'no_extra_steps';

export type BuiltRoutine = {
  /** Morning first, then evening. */
  routines: Routine[];
  notes: RoutineNote[];
};

/** What the screen needs to explain one step. Calculated every time, never saved. */
export type StepExplanation = {
  /** When the step is used (the routine it stands in). */
  timeOfUse: Slot;
  /** The content record that holds the purpose text; null when the content has none. */
  purposeId: string | null;
  /** Ids of ingredient groups to look for (from the content record). */
  componentsToLookFor: string[];
  personalWarnings: PersonalWarning[];
};

/** Why an optional step is not offered. */
export type OptionalRejection =
  'mode' | 'medical' | 'minor' | 'restriction' | 'not_in_goals' | 'slot_taken';

export type ChosenOptional = { info: RoutineStepInfo; slot: Slot };
export type RejectedOptional = { info: RoutineStepInfo; reason: OptionalRejection };

export type ShoppingNeedItem = {
  /** Stable: the same need keeps its id, so "done" survives a rebuild. */
  id: string;
  category: ProductCategory;
  priority: NeedPriority;
  /** The content record with the purpose text and the components; null when there is none. */
  purposeId: string | null;
  componentsToLookFor: string[];
  personalWarnings: PersonalWarning[];
  /** Only for the group "not needed now". */
  reason?: OptionalRejection;
};
