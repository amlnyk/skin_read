import { setModeIfFree, type Rule } from '../ruleTypes';

// Priority 3: reactive or sensitive skin first needs the barrier to be calmed.
// The contradiction "stable + sensitive" does not hide this: "sensitive" is still chosen.
export const barrierFirst: Rule = {
  id: 'barrier_first',
  priority: 3,
  apply({ fields }, draft) {
    const needsBarrier =
      fields.conditions.includes('reactive') || fields.conditions.includes('sensitive');
    if (needsBarrier) setModeIfFree(draft, 'barrier_first');
  },
};
