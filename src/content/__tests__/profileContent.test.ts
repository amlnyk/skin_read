import { describe, expect, it } from 'vitest';
import { SAFETY_MESSAGE_IDS, baseTypeSchema, conditionSchema, safetyNoteId } from '@/schemas';
import conditions from '../data/conditions.json';
import safetyMessages from '../data/safety-messages.json';
import skinTypes from '../data/skin-types.json';

// The records for the profile (stage 4). Names are from the spec (section 10); descriptions
// come only from the author's Figma texts (node 23:460) and say so in the source.
const FIGMA = 'Figma skin_read';

describe('skin types', () => {
  it('have a record for each base type that has a description in the spec (not "unsure")', () => {
    const covered = skinTypes.items.map((item) => item.baseType);
    expect(covered.sort()).toEqual(
      baseTypeSchema.options.filter((type) => type !== 'unsure').sort(),
    );
  });

  it('have names, and descriptions only from the Figma texts', () => {
    for (const item of skinTypes.items) {
      expect(item.nameUk).toBeTruthy();
      expect(item.description).not.toBeNull();
      expect(item.source).toContain(FIGMA);
      expect(item.reviewStatus).toBe('draft');
    }
  });
});

describe('conditions', () => {
  it('have a record for every condition of the dictionary', () => {
    expect(conditions.items.map((item) => item.condition).sort()).toEqual(
      [...conditionSchema.options].sort(),
    );
  });

  it('have names, and descriptions only from the Figma texts', () => {
    for (const item of conditions.items) {
      expect(item.nameUk).toBeTruthy();
      if (item.description !== null) expect(item.source).toContain(FIGMA);
      expect(item.reviewStatus).toBe('draft');
    }
    // Figma has no text for the combination skin: it stays empty
    const combination = conditions.items.find((item) => item.condition === 'combination');
    expect(combination?.description).toBeNull();
  });
});

describe('safety messages', () => {
  const byId = new Map(safetyMessages.items.map((item) => [item.id, item]));

  it('have the emergency and "see a doctor" messages under the agreed ids', () => {
    expect(byId.get(SAFETY_MESSAGE_IDS.emergency)?.level).toBe('emergency');
    expect(byId.get(SAFETY_MESSAGE_IDS.seeDoctor)?.level).toBe('see_doctor');
  });

  it('have a note record for every flag that only adds a note', () => {
    for (const flag of [
      'prescribed_derm_treatment',
      'pregnancy_or_planning',
      'other_limits',
    ] as const) {
      expect(byId.get(safetyNoteId(flag))?.level).toBe('note');
    }
  });

  it('notes without a text in the spec stay placeholders, never an invented text', () => {
    for (const item of safetyMessages.items.filter((record) => record.level === 'note')) {
      expect(item.text).toBeNull();
      expect(item.reviewStatus).toBe('placeholder');
    }
  });

  it('the two urgent messages point to the spec as their source', () => {
    for (const id of [SAFETY_MESSAGE_IDS.emergency, SAFETY_MESSAGE_IDS.seeDoctor]) {
      const record = byId.get(id);
      expect(record?.source).toContain('розділ 25');
      expect(record?.text).toBeTruthy();
    }
  });
});
