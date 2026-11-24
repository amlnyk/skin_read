import { describe, expect, it } from 'vitest';
import { loadBundledContent } from './bundled';

// The real files of src/content go through the same loader as in the app.
describe('bundled content (stage 2: placeholders only)', () => {
  it.each(['demo', 'public'] as const)('loads and validates in %s mode', (policy) => {
    const result = loadBundledContent(policy);
    expect(result.ok).toBe(true);
  });

  it('placeholders are never shown, whatever the policy', () => {
    for (const policy of ['demo', 'public'] as const) {
      const result = loadBundledContent(policy);
      if (!result.ok) throw new Error('content must load');
      for (const list of Object.values(result.value.bundle)) {
        expect(list).toEqual([]);
      }
    }
  });
});
