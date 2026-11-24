import type { Rule } from '../ruleTypes';

// Priority 2: known reactions and medical limits. They are copied as they are and
// later remove any recommendation of a lower priority (see applyRestrictions).
export const personalRestrictions: Rule = {
  id: 'personal_restrictions',
  priority: 2,
  apply({ fields, safety }, draft) {
    // "none_noticed" and "unknown" are not restrictions.
    draft.restrictions.reactions = fields.reactions.filter(
      (reaction) => reaction !== 'none_noticed' && reaction !== 'unknown',
    );
    draft.restrictions.medicalNotes = [...safety.medicalNotes];
  },
};
