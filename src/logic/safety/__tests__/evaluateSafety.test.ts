import { describe, expect, it } from 'vitest';
import { evaluateSafety } from '../evaluateSafety';

const flags = (...ids: string[]) => ({ q9_safety_flags: ids });

describe('evaluateSafety', () => {
  it('no answer or an empty answer: no danger', () => {
    expect(evaluateSafety({})).toEqual({ level: 'none', reasons: [], medicalNotes: [] });
    expect(evaluateSafety(flags())).toEqual({ level: 'none', reasons: [], medicalNotes: [] });
  });

  it('a painful swelling or burning means "see a doctor"', () => {
    const result = evaluateSafety(flags('painful_swelling_or_burning'));
    expect(result.level).toBe('see_doctor');
    expect(result.reasons).toEqual(['painful_swelling_or_burning']);
  });

  it('a strong or prolonged reaction means "see a doctor"', () => {
    expect(evaluateSafety(flags('strong_or_prolonged_reaction')).level).toBe('see_doctor');
  });

  it('breathing difficulty or a swollen lip or tongue means an emergency', () => {
    expect(evaluateSafety(flags('breathing_difficulty')).level).toBe('emergency');
    const result = evaluateSafety(flags('lip_or_tongue_swelling'));
    expect(result.level).toBe('emergency');
    expect(result.reasons).toEqual(['lip_or_tongue_swelling']);
  });

  it('an emergency wins over "see a doctor"', () => {
    const result = evaluateSafety(
      flags('painful_swelling_or_burning', 'breathing_difficulty', 'prescribed_derm_treatment'),
    );
    expect(result.level).toBe('emergency');
    expect(result.reasons).toEqual(['breathing_difficulty']);
    expect(result.medicalNotes).toEqual(['prescribed_derm_treatment']);
  });

  it('treatment, pregnancy and other limits only add notes, the level stays "none"', () => {
    const result = evaluateSafety(
      flags('pregnancy_or_planning', 'prescribed_derm_treatment', 'other_limits'),
    );
    expect(result.level).toBe('none');
    expect(result.reasons).toEqual([]);
    // the order follows the enum, not the order of tapping
    expect(result.medicalNotes).toEqual([
      'prescribed_derm_treatment',
      'pregnancy_or_planning',
      'other_limits',
    ]);
  });

  it('notes next to "see a doctor" are kept', () => {
    const result = evaluateSafety(
      flags('prescribed_derm_treatment', 'painful_swelling_or_burning'),
    );
    expect(result.level).toBe('see_doctor');
    expect(result.medicalNotes).toEqual(['prescribed_derm_treatment']);
  });

  it('unknown ids and a wrongly typed answer are ignored', () => {
    expect(evaluateSafety(flags('something_else')).level).toBe('none');
    expect(evaluateSafety({ q9_safety_flags: 'painful_swelling_or_burning' }).level).toBe('none');
  });

  it('the same answers give the same result whatever the order', () => {
    const a = evaluateSafety(flags('other_limits', 'pregnancy_or_planning'));
    const b = evaluateSafety(flags('pregnancy_or_planning', 'other_limits'));
    expect(a).toEqual(b);
  });
});
