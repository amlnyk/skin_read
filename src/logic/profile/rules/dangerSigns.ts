import { setModeIfFree, type Rule } from '../ruleTypes';

// Priority 1: signs that need a doctor or an ambulance decide the mode before anything else.
export const dangerSigns: Rule = {
  id: 'danger_signs',
  priority: 1,
  apply({ safety }, draft) {
    if (safety.level === 'emergency') setModeIfFree(draft, 'emergency');
    if (safety.level === 'see_doctor') setModeIfFree(draft, 'see_doctor');
  },
};
