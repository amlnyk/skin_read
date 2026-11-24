import type { Rule } from '../ruleTypes';

// Priority 7: personal wishes ("avoid silicones") are the weakest filter.
export const preferences: Rule = {
  id: 'preferences',
  priority: 7,
  apply({ fields }, draft) {
    draft.restrictions.avoid = fields.avoid.filter((item) => item !== 'none');
  },
};
