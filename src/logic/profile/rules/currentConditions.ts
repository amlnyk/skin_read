import { conditionSchema } from '@/schemas';
import { addNote, type Rule } from '../ruleTypes';

// Priority 4: one reference to a text block per chosen condition. Only references:
// the text itself is content and is never generated.
export const currentConditions: Rule = {
  id: 'current_conditions',
  priority: 4,
  apply({ fields, content }, draft) {
    for (const condition of conditionSchema.options) {
      if (!fields.conditions.includes(condition)) continue;
      const record = content.conditions.find((item) => item.condition === condition);
      const contentId = record && record.description !== null ? record.id : null;
      draft.conditionBlocks.push({ kind: 'condition', key: condition, contentId });
      // No own text for combination skin: the text of the base type is used, and we say so.
      if (condition === 'combination' && contentId === null)
        addNote(draft, 'combination_text_pending');
    }
  },
};
