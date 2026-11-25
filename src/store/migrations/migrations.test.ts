import { describe, expect, it } from 'vitest';
import v1 from '@fixtures/persisted-v1.json';
import v2 from '@fixtures/persisted-v2.json';
import { persistedStateSchema } from '@/schemas';
import { migrate, STORE_VERSION } from './index';

describe('migrations', () => {
  it('the current version is 3', () => {
    expect(STORE_VERSION).toBe(3);
  });

  it('keeps the data of the current version as is', () => {
    const data = { anything: [1, 2, 3] };
    expect(migrate(data, 3)).toBe(data);
  });

  it('2 -> 3: gives the profile an empty list of reaction ingredients and loses nothing', () => {
    const migrated = migrate(v2, 2) as typeof v2 & { profile: { reactionIngredients: string[] } };
    expect(persistedStateSchema.safeParse(migrated).success).toBe(true);
    expect(migrated.profile.reactionIngredients).toEqual([]);
    // the profile is the same except for the new field
    const { reactionIngredients, ...rest } = migrated.profile;
    expect(reactionIngredients).toEqual([]);
    expect(rest).toEqual(v2.profile);
    // every other slice is untouched
    expect({ ...migrated, profile: v2.profile }).toEqual(v2);
  });

  it('2 -> 3 keeps a list that is already there and can run twice', () => {
    const marked = { ...v2, profile: { ...v2.profile, reactionIngredients: ['niacinamide'] } };
    const once = migrate(marked, 2) as typeof marked;
    expect(once.profile.reactionIngredients).toEqual(['niacinamide']);
    expect(migrate(once, 2)).toEqual(once);
  });

  it('2 -> 3 works without a profile', () => {
    const empty = { ...v2, profile: null };
    expect(migrate(empty, 2)).toEqual(empty);
  });

  it('1 -> 3: the old data of stage 1 goes through both steps', () => {
    const migrated = migrate(v1, 1) as { profile: { reactionIngredients: string[] } };
    expect(migrated.profile.reactionIngredients).toEqual([]);
    expect(persistedStateSchema.safeParse(migrated).success).toBe(true);
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
