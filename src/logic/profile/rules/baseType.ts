import { addNote, type Rule } from '../ruleTypes';

// Priority 5: the base type. "Not sure" asks to repeat the test later.
export const baseType: Rule = {
  id: 'base_type',
  priority: 5,
  apply({ fields, content }, draft) {
    const record = content.skinTypes.find((item) => item.baseType === fields.baseType);
    const contentId = record && record.description !== null ? record.id : null;
    draft.typeBlocks.push({ kind: 'skin_type', key: fields.baseType, contentId });
    if (fields.baseType === 'unsure') addNote(draft, 'type_unsure_retest');
  },
};
