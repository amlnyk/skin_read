import { describe, expect, it } from 'vitest';
import { QUESTION_IDS } from '@/schemas';
import { loadBundledContent } from './bundled';

// The real files of src/content go through the same loader as in the app.
describe('bundled content', () => {
  it.each(['demo', 'public'] as const)('loads and validates in %s mode', (policy) => {
    expect(loadBundledContent(policy).ok).toBe(true);
  });

  it('placeholders are never shown, whatever the policy', () => {
    for (const policy of ['demo', 'public'] as const) {
      const result = loadBundledContent(policy);
      if (!result.ok) throw new Error('content must load');
      for (const list of Object.values(result.value.bundle)) {
        for (const record of list as { reviewStatus: string }[]) {
          expect(record.reviewStatus).not.toBe('placeholder');
        }
      }
    }
  });

  it('the questionnaire (draft texts from the spec) is shown in demo and hidden in public', () => {
    const demo = loadBundledContent('demo');
    const publicMode = loadBundledContent('public');
    if (!demo.ok || !publicMode.ok) throw new Error('content must load');
    expect(demo.value.bundle.questionnaire.map((q) => q.id)).toEqual(Object.values(QUESTION_IDS));
    expect(publicMode.value.bundle.questionnaire).toEqual([]);
  });
});
