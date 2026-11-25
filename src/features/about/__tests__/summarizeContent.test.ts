import { describe, expect, it } from 'vitest';
import { createEmptyBundle } from '@/test/helpers/fakes';
import { summarizeContent } from '../utils/summarizeContent';

const record = (
  id: string,
  source: string,
  reviewStatus: 'verified' | 'draft' | 'placeholder',
) => ({
  id,
  source,
  reviewStatus,
});

describe('summarizeContent', () => {
  it('is empty for an empty bundle', () => {
    expect(summarizeContent(createEmptyBundle())).toEqual({
      sources: [],
      statuses: { verified: 0, draft: 0, placeholder: 0 },
    });
  });

  it('groups by the document before the first comma and counts the statuses', () => {
    const bundle = {
      ...createEmptyBundle(),
      skinTypes: [
        record('a', 'ТЗ v1.1, розділ 3', 'draft'),
        record('b', 'ТЗ v1.1, розділ 4', 'verified'),
        record('c', 'технічна заглушка', 'placeholder'),
      ],
      conditions: [record('d', 'ТЗ v1.1', 'draft')],
    } as unknown as Parameters<typeof summarizeContent>[0];
    const summary = summarizeContent(bundle);
    expect(summary.sources).toEqual([
      { name: 'ТЗ v1.1', count: 3 },
      { name: 'технічна заглушка', count: 1 },
    ]);
    expect(summary.statuses).toEqual({ verified: 1, draft: 2, placeholder: 1 });
  });

  it('orders equal counts by name', () => {
    const bundle = {
      ...createEmptyBundle(),
      skinTypes: [record('a', 'Б', 'draft'), record('b', 'А', 'draft')],
    } as unknown as Parameters<typeof summarizeContent>[0];
    expect(summarizeContent(bundle).sources.map((row) => row.name)).toEqual(['А', 'Б']);
  });
});
