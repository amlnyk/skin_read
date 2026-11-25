// The edit distance between two strings (insert, delete, replace one character = 1).
// Written here on purpose: no dependency for a dozen lines.
//
// `limit` stops the work early: when the distance is certainly above `limit`, the function
// returns `limit + 1` (not the exact value). Without a limit the distance is exact.

const at = (row: readonly number[], index: number): number => row[index] ?? 0;

export function levenshtein(a: string, b: string, limit = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  const left = Array.from(a);
  const right = Array.from(b);
  if (left.length === 0) return Math.min(right.length, limit + 1);
  if (right.length === 0) return Math.min(left.length, limit + 1);
  // the length difference alone is a lower bound
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(
        at(previous, j) + 1, // delete
        at(current, j - 1) + 1, // insert
        at(previous, j - 1) + cost, // replace
      );
      current.push(value);
      if (value < rowMinimum) rowMinimum = value;
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return at(previous, right.length);
}
