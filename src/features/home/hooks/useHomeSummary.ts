import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import { analyzeSavedProfile } from '@/logic/profile';
import { buildShoppingNeeds, doneStepIds, ROUTINE_IDS } from '@/logic/routine';
import { SAFETY_MESSAGE_IDS } from '@/schemas';
import { useAppStore } from '@/store';
import type { ProductCategory, Slot } from '@/types';

// answers that mean "nothing to restrict"
const NO_REACTION: ReadonlySet<string> = new Set(['none_noticed', 'unknown']);

const two = (value: number) => String(value).padStart(2, '0');

/** The calendar day of the user (their own time zone) as YYYY-MM-DD. */
export function localDay(nowMs: number): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/** Morning until 15:00 local time, evening after. Only picks which routine is shown first. */
export function slotAt(nowMs: number): Slot {
  return new Date(nowMs).getHours() < 15 ? 'am' : 'pm';
}

/**
 * What the home screen shows. Nothing new is calculated here: the same logic as the care and
 * profile screens (analyzeSavedProfile, buildShoppingNeeds), only fewer details.
 */
export function useHomeSummary() {
  const { content, clock } = useServices();
  const profile = useAppStore((state) => state.profile);
  const routines = useAppStore((state) => state.routine);
  const log = useAppStore((state) => state.routineLog);
  const needStates = useAppStore((state) => state.needs);
  const products = useAppStore((state) => state.products);
  const testAnswers = useAppStore((state) => state.testDraft.answers);
  const bundle = content.bundle;
  const now = clock.now();

  const analysis = useMemo(
    () => (profile ? analyzeSavedProfile(profile, testAnswers, bundle, now) : null),
    [profile, testAnswers, bundle, now],
  );

  const openNeeds = useMemo((): ProductCategory[] => {
    if (!profile || !analysis || routines.length === 0) return [];
    return buildShoppingNeeds(routines, products, profile, analysis, bundle)
      .filter((need) => need.priority === 'base' || need.priority === 'missing')
      .filter((need) => {
        const state = needStates.find((item) => item.id === need.id);
        return !state?.done && !state?.dismissed;
      })
      .map((need) => need.category);
  }, [profile, analysis, routines, products, bundle, needStates]);

  const slot = slotAt(now);
  const routine = routines.find((item) => item.id === ROUTINE_IDS[slot]) ?? null;
  const steps = routine ? [...routine.steps].sort((a, b) => a.order - b.order) : [];
  const done = doneStepIds(log, localDay(now), slot).filter((id) =>
    steps.some((step) => step.id === id),
  );

  const typeName =
    profile && profile.baseType !== 'unsure'
      ? (bundle.skinTypes.find((item) => item.baseType === profile.baseType)?.nameUk ?? null)
      : null;
  const conditionNames = profile
    ? profile.conditions
        .map((condition) => bundle.conditions.find((item) => item.condition === condition)?.nameUk)
        .filter((name): name is string => Boolean(name))
    : [];
  const restrictionCount = profile
    ? profile.reactions.filter((item) => !NO_REACTION.has(item)).length +
      profile.avoid.filter((item) => item !== 'none').length +
      profile.reactionIngredients.length
    : 0;

  return {
    profile,
    mode: analysis?.mode ?? null,
    typeName,
    conditionNames,
    restrictionCount,
    slot,
    stepCategories: steps.map((step) => step.category),
    doneCount: done.length,
    openNeeds: [...new Set(openNeeds)],
    seeDoctorText:
      bundle.safetyMessages.find((item) => item.id === SAFETY_MESSAGE_IDS.seeDoctor)?.text ?? null,
  };
}
