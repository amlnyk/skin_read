import { addNote, type Rule } from '../ruleTypes';

// Priority 4: a physiological factor only adds a suggestion to keep a diary.
// Sex and cycle never change the type, the mode or the restrictions.
export const cycleDiary: Rule = {
  id: 'cycle_diary',
  priority: 4,
  apply({ fields }, draft) {
    if (fields.cycle.status === 'noticed') addNote(draft, 'suggest_cycle_diary');
  },
};
