import { describe, expect, it } from 'vitest';
import valid from '@fixtures/persisted-valid.json';
import { persistedStateSchema } from '@/schemas';
import type { PersistedState } from '@/types';
import { DATA_CATEGORIES, deleteCategory, hasCycleData, summarizeData } from './dataCategories';

const NOW_ISO = '2026-01-15T12:00:00.000Z';
const base = persistedStateSchema.parse(valid);

// A state that has a little of everything the categories touch.
const full: PersistedState = {
  ...base,
  careSetup: { scenario: 'partial', ownedCategories: ['cleanser'], builtForRevision: 1 },
  routine: [
    {
      id: 'routine-am',
      slot: 'am',
      steps: [
        {
          id: 's1',
          order: 0,
          category: 'cleanser',
          productId: 'p1',
          status: 'owned',
          frequency: 'daily',
        },
        {
          id: 's2',
          order: 1,
          category: 'moisturizer',
          productId: 'p2',
          status: 'owned',
          frequency: 'daily',
        },
        {
          id: 's3',
          order: 2,
          category: 'serum',
          contentId: 'step-serum',
          productId: 'p3',
          status: 'owned',
          frequency: 'daily',
        },
        { id: 's4', order: 3, category: 'sunscreen', status: 'to_choose', frequency: 'daily' },
      ],
    },
  ],
  journal: [
    {
      id: 'j1',
      date: '2026-01-10',
      symptoms: { dryness: 2 },
      newProductIds: ['p1'],
      cyclePeriod: 'pre_menstrual',
      note: 'first',
    },
    { id: 'j2', date: '2026-01-11', symptoms: {}, newProductIds: [], note: 'second' },
  ],
  testDraft: {
    ...base.testDraft,
    answers: {
      q1_base_type: 'oily',
      q6_sex: 'female',
      q6_1_cycle: ['pre_menstrual'],
      q6_1_effects: ['more_breakouts', 'other'],
      'q6_1_effects:other:text': 'my words',
    },
  },
  profile: base.profile && {
    ...base.profile,
    revision: 4,
    sex: 'female',
    cycle: { status: 'noticed', phases: ['pre_menstrual'], effects: ['more_breakouts'] },
  },
  settings: { ...base.settings, cycleTrackingVisible: true },
};

describe('deleting one category leaves the rest as it is', () => {
  it('journal: the entries go, nothing else', () => {
    const next = deleteCategory(full, 'journal', NOW_ISO);
    expect(next.journal).toEqual([]);
    expect({ ...next, journal: full.journal }).toEqual(full);
  });

  it('scans: the history goes, nothing else', () => {
    const withScans = { ...full, scans: [] };
    expect(deleteCategory(withScans, 'scans', NOW_ISO)).toEqual(withScans);
    expect(deleteCategory(full, 'scans', NOW_ISO).scans).toEqual([]);
  });

  it('collection: products go; routine steps keep their place and lose the product', () => {
    const next = deleteCategory(full, 'collection', NOW_ISO);
    expect(next.products).toEqual([]);
    const steps = next.routine[0]?.steps ?? [];
    expect(steps.map((step) => step.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(steps.every((step) => step.productId === undefined)).toBe(true);
    // the category the user said they own stays "owned"; a step of the content goes back to
    // "optional"; any other goes back to "to choose"
    expect(steps.map((step) => step.status)).toEqual([
      'owned',
      'to_choose',
      'optional',
      'to_choose',
    ]);
    expect(steps[0]).not.toHaveProperty('productId');
  });

  it('collection: the journal keeps its entries but no longer points at products', () => {
    const next = deleteCategory(full, 'collection', NOW_ISO);
    expect(next.journal.map((entry) => entry.id)).toEqual(['j1', 'j2']);
    expect(next.journal.every((entry) => entry.newProductIds.length === 0)).toBe(true);
    expect(next.journal[0]?.note).toBe('first');
  });

  it('collection: the profile, the scans and the settings stay', () => {
    const next = deleteCategory(full, 'collection', NOW_ISO);
    expect(next.profile).toEqual(full.profile);
    expect(next.scans).toEqual(full.scans);
    expect(next.settings).toEqual(full.settings);
  });

  it('cycle: gone from the profile, the answers, the journal and the switch', () => {
    const next = deleteCategory(full, 'cycle', NOW_ISO);
    expect(next.profile?.cycle).toEqual({ status: null, phases: [], effects: [] });
    expect(next.profile?.revision).toBe(5);
    expect(next.profile?.updatedAt).toBe(NOW_ISO);
    expect(next.testDraft.answers).toEqual({ q1_base_type: 'oily', q6_sex: 'female' });
    expect(next.journal.map((entry) => entry.cyclePeriod)).toEqual([undefined, undefined]);
    expect(next.journal[0]).not.toHaveProperty('cyclePeriod');
    expect(next.settings.cycleTrackingVisible).toBe(false);
    expect(hasCycleData(next)).toBe(false);
  });

  it('cycle: the rest of the entries and of the profile is untouched, the sex stays', () => {
    const next = deleteCategory(full, 'cycle', NOW_ISO);
    expect(next.journal[0]).toEqual({
      id: 'j1',
      date: '2026-01-10',
      symptoms: { dryness: 2 },
      newProductIds: ['p1'],
      note: 'first',
    });
    expect(next.profile?.sex).toBe('female');
    expect(next.products).toEqual(full.products);
    expect(next.routine).toEqual(full.routine);
  });

  it('cycle: when there is no cycle data the revision does not move', () => {
    const clean = deleteCategory(full, 'cycle', NOW_ISO);
    const again = deleteCategory(clean, 'cycle', '2026-02-01T00:00:00.000Z');
    expect(again).toEqual(clean);
  });

  it('cycle: works without a profile', () => {
    const noProfile = { ...full, profile: null };
    const next = deleteCategory(noProfile, 'cycle', NOW_ISO);
    expect(next.profile).toBeNull();
    expect(next.journal[0]).not.toHaveProperty('cyclePeriod');
  });

  it.each(DATA_CATEGORIES)(
    '%s: the result is a valid saved state and the input is not changed',
    (category) => {
      const before = JSON.stringify(full);
      const next = deleteCategory(full, category, NOW_ISO);
      expect(JSON.stringify(full)).toBe(before);
      expect(persistedStateSchema.safeParse(next).success).toBe(true);
    },
  );
});

describe('what is stored', () => {
  it('counts every kind', () => {
    expect(summarizeData(full)).toEqual({
      hasProfile: true,
      testAnswers: 5,
      routineSteps: 4,
      products: 1,
      scans: 0,
      journal: 2,
    });
  });

  it('sees cycle data wherever it is', () => {
    expect(hasCycleData(full)).toBe(true);
    const onlyJournal = deleteCategory(full, 'cycle', NOW_ISO);
    expect(hasCycleData({ ...onlyJournal, journal: full.journal })).toBe(true);
    expect(hasCycleData(base)).toBe(false);
  });
});
