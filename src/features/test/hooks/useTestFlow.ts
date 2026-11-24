import { useMemo, useState } from 'react';
import { useServices } from '@/lib/services';
import {
  applySelection,
  findContradictions,
  getVisibleQuestions,
  isAnswered,
  otherTextKey,
  pruneHiddenAnswers,
  validateAnswers,
  type Contradiction,
} from '@/logic/test';
import { QUESTION_IDS, type TestDraft } from '@/schemas';
import { useAppStore, useAppStoreApi } from '@/store';

export type ContradictionChoice = 'keep_both' | 'remove_stable';

const STABLE = 'stable';

/**
 * The state machine of the test screen. Everything is saved to the store after each answer
 * (testDraft), so a reload returns to the same question.
 *
 * "Finished" is `startedAt` set and `currentQuestionId` null (the draft keeps the raw answers
 * for the profile calculation of stage 4).
 */
export function useTestFlow() {
  const { content, clock } = useServices();
  const store = useAppStoreApi();
  const draft = useAppStore((state) => state.testDraft);
  const [pending, setPending] = useState<Contradiction | null>(null);

  const questions = content.bundle.questionnaire;
  const answers = draft.answers;
  const visible = useMemo(() => getVisibleQuestions(questions, answers), [questions, answers]);

  const finished = draft.startedAt !== null && draft.currentQuestionId === null;
  const current = finished
    ? null
    : (visible.find((q) => q.id === draft.currentQuestionId) ?? visible[0] ?? null);
  const index = current ? visible.indexOf(current) : -1;

  // Read the latest draft from the store: several calls can happen before React re-renders.
  const freshAnswers = () => store.getState().testDraft.answers;

  const save = (patch: Partial<TestDraft>) => {
    const nowIso = new Date(clock.now()).toISOString();
    const { testDraft, actions } = store.getState();
    actions.testDraft.update({
      startedAt: testDraft.startedAt ?? nowIso,
      updatedAt: nowIso,
      ...patch,
    });
  };

  const finish = (finalAnswers: TestDraft['answers']) => {
    const result = validateAnswers(questions, finalAnswers);
    const target = result.missingRequired[0] ?? result.invalid[0]?.questionId;
    // Something required is missing (for example the questionnaire changed): go back to it.
    save({ currentQuestionId: target ?? null });
  };

  const goForward = (fromId: string, nowAnswers: TestDraft['answers']) => {
    const list = getVisibleQuestions(questions, nowAnswers);
    const next = list[list.findIndex((q) => q.id === fromId) + 1];
    if (next) save({ currentQuestionId: next.id });
    else finish(nowAnswers);
  };

  const select = (optionId: string) => {
    if (!current) return;
    const now = freshAnswers();
    const value = applySelection(current, now[current.id], optionId);
    const merged = pruneHiddenAnswers(questions, { ...now, [current.id]: value });
    save({ answers: merged, currentQuestionId: current.id });
  };

  const setOtherText = (optionId: string, text: string) => {
    if (!current) return;
    const key = otherTextKey(current.id, optionId);
    const next = { ...freshAnswers() };
    if (text === '') delete next[key];
    else next[key] = text;
    save({ answers: next, currentQuestionId: current.id });
  };

  // For a question of type "text": the whole answer is the text.
  const setText = (text: string) => {
    if (!current) return;
    save({ answers: { ...freshAnswers(), [current.id]: text }, currentQuestionId: current.id });
  };

  const next = () => {
    if (!current) return;
    const now = freshAnswers();
    if (current.required && !isAnswered(current, now)) return;
    if (current.id === QUESTION_IDS.conditions) {
      const found = findContradictions(now)[0];
      if (found) {
        setPending(found);
        return;
      }
    }
    goForward(current.id, now);
  };

  const skip = () => {
    if (!current || current.required) return;
    goForward(current.id, freshAnswers());
  };

  const back = () => {
    const previous = visible[index - 1];
    if (previous) save({ currentQuestionId: previous.id });
  };

  const resolveContradiction = (choice: ContradictionChoice) => {
    const found = pending;
    setPending(null);
    if (!found) return;
    const now = freshAnswers();
    if (choice === 'remove_stable') {
      const chosen = now[found.questionId];
      const kept = Array.isArray(chosen) ? chosen.filter((id) => id !== STABLE) : [];
      const updated = { ...now, [found.questionId]: kept };
      save({ answers: updated });
      goForward(found.questionId, updated);
    } else {
      goForward(found.questionId, now);
    }
  };

  const restart = () => {
    setPending(null);
    store.getState().actions.testDraft.clear();
  };

  return {
    hasQuestions: questions.length > 0,
    visible,
    current,
    index,
    total: visible.length,
    isLast: index === visible.length - 1,
    answers,
    finished,
    canGoNext: current !== null && (!current.required || isAnswered(current, answers)),
    pending,
    select,
    setOtherText,
    setText,
    next,
    skip,
    back,
    resolveContradiction,
    restart,
  };
}
