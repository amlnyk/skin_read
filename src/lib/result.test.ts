import { describe, expect, it } from 'vitest';
import { err, mapResult, ok, unwrapOr } from './result';

describe('Result', () => {
  it('ok and err carry their payload', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });

  it('mapResult maps only the ok branch', () => {
    expect(mapResult(ok(2), (n) => n * 2)).toEqual(ok(4));
    const failure = err('x');
    expect(mapResult(failure, (n: number) => n * 2)).toBe(failure);
  });

  it('unwrapOr returns the value or the fallback', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
    expect(unwrapOr(err('x'), 0)).toBe(0);
  });
});
