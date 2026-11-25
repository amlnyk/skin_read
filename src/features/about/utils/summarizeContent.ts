import type { ContentBundle, ReviewStatus } from '@/schemas';

export type SourceRow = { readonly name: string; readonly count: number };
export type ContentSummary = {
  readonly sources: readonly SourceRow[];
  readonly statuses: Readonly<Record<ReviewStatus, number>>;
};

type Record_ = { readonly source: string; readonly reviewStatus: ReviewStatus };

// The part of "source" before the first comma is the document, the rest is the place in it.
function documentOf(source: string): string {
  return source.split(',')[0]?.trim() ?? source;
}

/** Counts the records of the (already policy-filtered) bundle by source document and status. */
export function summarizeContent(bundle: ContentBundle): ContentSummary {
  const bySource = new Map<string, number>();
  const statuses: Record<ReviewStatus, number> = { verified: 0, draft: 0, placeholder: 0 };
  for (const list of Object.values(bundle) as readonly (readonly Record_[])[]) {
    for (const record of list) {
      const name = documentOf(record.source);
      bySource.set(name, (bySource.get(name) ?? 0) + 1);
      statuses[record.reviewStatus] += 1;
    }
  }
  const sources = [...bySource.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'uk'));
  return { sources, statuses };
}
