import { useMemo } from 'react';
import { useServices } from '@/lib/services';
import { analyzeSavedProfile } from '@/logic/profile';
import { doneStepIds, ROUTINE_IDS } from '@/logic/routine';
import { SAFETY_MESSAGE_IDS } from '@/schemas';
import { useAppStore } from '@/store';
import type { ProductCategory, Slot } from '@/types';

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

export type TodayStep = { id: string; category: ProductCategory; productName: string | null };

/**
 * What the "Сьогодні" screen shows: the steps of the morning and the evening, what is already
 * marked today and today's skin feeling from the journal. Nothing new is calculated here.
 */
export function useHomeSummary() {
  const { content, clock } = useServices();
  const profile = useAppStore((state) => state.profile);
  const routines = useAppStore((state) => state.routine);
  const log = useAppStore((state) => state.routineLog);
  const products = useAppStore((state) => state.products);
  const journal = useAppStore((state) => state.journal);
  const testAnswers = useAppStore((state) => state.testDraft.answers);
  const bundle = content.bundle;
  const now = clock.now();
  const today = localDay(now);

  const analysis = useMemo(
    () => (profile ? analyzeSavedProfile(profile, testAnswers, bundle, now) : null),
    [profile, testAnswers, bundle, now],
  );

  const stepsOf = (slot: Slot): TodayStep[] => {
    const routine = routines.find((item) => item.id === ROUTINE_IDS[slot]);
    if (!routine) return [];
    return [...routine.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step.id,
        category: step.category,
        productName: products.find((product) => product.id === step.productId)?.name ?? null,
      }));
  };

  const am = stepsOf('am');
  const pm = stepsOf('pm');
  const todayEntry = journal.find((entry) => entry.date === today) ?? null;

  return {
    profile,
    mode: analysis?.mode ?? null,
    today,
    nowMs: now,
    firstSlot: slotAt(now),
    steps: { am, pm },
    done: {
      am: doneStepIds(log, today, 'am').filter((id) => am.some((step) => step.id === id)),
      pm: doneStepIds(log, today, 'pm').filter((id) => pm.some((step) => step.id === id)),
    },
    todayEntry,
    seeDoctorText:
      bundle.safetyMessages.find((item) => item.id === SAFETY_MESSAGE_IDS.seeDoctor)?.text ?? null,
  };
}
