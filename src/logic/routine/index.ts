export {
  BASE_CATEGORIES,
  baseStepId,
  buildBaseRoutine,
  optionalStepId,
  ROUTINE_IDS,
} from './buildBaseRoutine';
export { analyzeRoutine } from './analyzeRoutine';
export { attachProduct, canAttach } from './attachProduct';
export { buildShoppingNeeds } from './buildShoppingNeeds';
export { doneStepIds, markStep } from './doneLog';
export { ADDABLE_CATEGORIES, addStep, canAddCategory, moveStep, removeStep } from './editRoutine';
export { explainStep } from './explainStep';
export { fillTemplate } from './fillTemplate';
export { selectOptionalSteps } from './optional';
export { personalWarnings } from './warnings';
export { REQUIRED_BASE_STEPS } from './routineChecks';
export { categoriesInSlots, routineProducts, type RoutineEntry } from './routineProducts';
export type {
  BuiltRoutine,
  ChosenOptional,
  OptionalRejection,
  PersonalWarning,
  RejectedOptional,
  RoutineNote,
  ShoppingNeedItem,
  StepExplanation,
} from './types';
