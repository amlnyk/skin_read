import { describe, expect, it } from 'vitest';
import { systemClock } from '../clock';

describe('systemClock', () => {
  it('returns current epoch milliseconds', () => {
    const before = Date.now();
    const now = systemClock.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
