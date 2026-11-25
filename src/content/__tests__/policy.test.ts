import { describe, expect, it } from 'vitest';
import { applyContentPolicy, isVisible } from '../policy';
import { createEmptyBundle } from '@/test/helpers/fakes';

describe('content policy', () => {
  it('shows records by review status', () => {
    expect(isVisible('verified', 'public')).toBe(true);
    expect(isVisible('verified', 'demo')).toBe(true);
    expect(isVisible('draft', 'demo')).toBe(true);
    expect(isVisible('draft', 'public')).toBe(false);
    expect(isVisible('placeholder', 'demo')).toBe(false);
    expect(isVisible('placeholder', 'public')).toBe(false);
  });

  it('an empty bundle stays empty', () => {
    expect(applyContentPolicy(createEmptyBundle(), 'public')).toEqual(createEmptyBundle());
  });
});
