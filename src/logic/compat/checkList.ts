import { checkPair } from './checkPair';
import { compatSeverity } from './severity';
import { sameSubject } from './subjects';
import type { CompatContent, CompatContext, CompatResult, CompatSubject } from './types';

// All pairs of a list of components, the most important first.

export function checkList(
  subjects: readonly CompatSubject[],
  ctx: CompatContext,
  content: CompatContent,
): CompatResult[] {
  const distinct: CompatSubject[] = [];
  for (const subject of subjects) {
    if (!distinct.some((known) => sameSubject(known, subject))) distinct.push(subject);
  }

  const results: CompatResult[] = [];
  for (let i = 0; i < distinct.length; i += 1) {
    for (let j = i + 1; j < distinct.length; j += 1) {
      const a = distinct[i];
      const b = distinct[j];
      if (a && b) results.push(checkPair(a, b, ctx, content));
    }
  }
  // Array.prototype.sort is stable: equal severities keep the order of the pairs
  return results.sort((x, y) => compatSeverity(x.status) - compatSeverity(y.status));
}
