import { describe, expect, it } from 'vitest';
import v1 from '@fixtures/persisted-v1.json';
import { persistedStateSchema } from '@/schemas';
import { migrate, STORE_VERSION } from './index';

describe('migrations', () => {
  it('the current version is 2', () => {
    expect(STORE_VERSION).toBe(2);
  });

  it('keeps the data of the current version as is', () => {
    const data = { anything: [1, 2, 3] };
    expect(migrate(data, 2)).toBe(data);
  });

  it('1 -> 2: adds careSetup and keeps only what the user did with a need', () => {
    const migrated = migrate(v1, 1);
    expect(persistedStateSchema.safeParse(migrated).success).toBe(true);
    const state = migrated as { careSetup: unknown; needs: unknown; profile: { id: string } };
    expect(state.careSetup).toEqual({
      scenario: null,
      ownedCategories: [],
      builtForRevision: null,
    });
    expect(state.needs).toEqual([{ id: 'need-1', done: false, dismissed: false }]);
    // everything else is untouched
    expect(state.profile.id).toBe('profile-1');
  });

  it('1 -> 2 can run again on migrated data without harm', () => {
    const once = migrate(v1, 1);
    expect(migrate(once, 1)).toEqual(once);
  });

  it('data of version 0 passes the same steps and does not lose anything', () => {
    expect(persistedStateSchema.safeParse(migrate(v1, 0)).success).toBe(true);
  });

  it('data that is not an object is passed on unchanged for the validation to reject', () => {
    expect(migrate('broken', 1)).toBe('broken');
  });
});
