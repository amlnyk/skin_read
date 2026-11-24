import { describe, expect, it } from 'vitest';
import { migrate, STORE_VERSION } from './index';

describe('migrations', () => {
  it('the current version is 1', () => {
    expect(STORE_VERSION).toBe(1);
  });

  it('keeps the data as is while there is nothing to migrate', () => {
    const data = { anything: [1, 2, 3] };
    expect(migrate(data, 1)).toBe(data);
  });

  it('does not drop data saved by an older version without a step', () => {
    const data = { anything: true };
    expect(migrate(data, 0)).toBe(data);
  });
});
