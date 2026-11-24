import type { Rule } from '../ruleTypes';

// Priority 2: for users under 18 the recommendations are extra careful
// (no anti-age steps, no automatic actives). The routine stage reads this flag.
export const minorMode: Rule = {
  id: 'minor_mode',
  priority: 2,
  apply({ fields }, draft) {
    draft.minorMode = fields.ageBand === 'under_18';
  },
};
