import type { RoutineLog, Slot } from '@/types';

/** The ids of the steps marked as done for the day and the slot (an empty list when there is no entry). */
export function doneStepIds(logs: readonly RoutineLog[], date: string, slot: Slot): string[] {
  return logs.find((entry) => entry.date === date && entry.slot === slot)?.doneStepIds ?? [];
}

/** The entry after a step is marked or unmarked. A mark counts for one day only: no streaks. */
export function markStep(
  logs: readonly RoutineLog[],
  date: string,
  slot: Slot,
  stepId: string,
  done: boolean,
): RoutineLog {
  const current = doneStepIds(logs, date, slot).filter((id) => id !== stepId);
  return { date, slot, doneStepIds: done ? [...current, stepId] : current };
}
