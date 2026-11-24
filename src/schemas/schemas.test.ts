import { describe, expect, it } from 'vitest';
import valid from '@fixtures/persisted-valid.json';
import {
  careSetupSchema,
  contentBundleSchema,
  ingredientSchema,
  journalEntrySchema,
  persistedStateSchema,
  productSchema,
  routineStepInfoSchema,
  scanResultSchema,
  settingsSchema,
  shoppingNeedSchema,
  skinProfileSchema,
} from './index';

const NOW = '2026-01-01T10:00:00.000Z';

describe('persistedStateSchema', () => {
  it('accepts a complete valid state', () => {
    expect(persistedStateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a wrong type of a field', () => {
    const broken = { ...valid, onboarding: { completed: 'yes' } };
    expect(persistedStateSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects a missing slice', () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.journal;
    expect(persistedStateSchema.safeParse(rest).success).toBe(false);
  });
});

describe('limits from the security plan', () => {
  const product = valid.products[0];

  it('product name: up to 120 characters', () => {
    expect(productSchema.safeParse({ ...product, name: 'a'.repeat(120) }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, name: 'a'.repeat(121) }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, name: '' }).success).toBe(false);
  });

  it('composition: up to 10 000 characters', () => {
    expect(productSchema.safeParse({ ...product, inciRaw: 'a'.repeat(10_000) }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, inciRaw: 'a'.repeat(10_001) }).success).toBe(
      false,
    );
  });

  it('note: up to 2 000 characters', () => {
    expect(productSchema.safeParse({ ...product, note: 'a'.repeat(2_000) }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, note: 'a'.repeat(2_001) }).success).toBe(false);
    const entry = valid.journal[0];
    expect(journalEntrySchema.safeParse({ ...entry, note: 'a'.repeat(2_001) }).success).toBe(false);
  });
});

describe('dates and times', () => {
  it('dates are ISO strings only', () => {
    const entry = valid.journal[0];
    expect(journalEntrySchema.safeParse({ ...entry, date: '2026-02-30' }).success).toBe(false);
    expect(journalEntrySchema.safeParse({ ...entry, date: '01.02.2026' }).success).toBe(false);
    expect(journalEntrySchema.safeParse({ ...entry, date: new Date() }).success).toBe(false);
  });

  it('reminder time is HH:MM', () => {
    const reminder = (time: string) => ({
      ...valid.settings,
      reminders: { ...valid.settings.reminders, am: { enabled: true, time } },
    });
    expect(settingsSchema.safeParse(reminder('07:30')).success).toBe(true);
    expect(settingsSchema.safeParse(reminder('25:00')).success).toBe(false);
    expect(settingsSchema.safeParse(reminder('7:30')).success).toBe(false);
  });

  it('journal intensity is 0 to 3', () => {
    const entry = (dryness: number) => ({ ...valid.journal[0], symptoms: { dryness } });
    expect(journalEntrySchema.safeParse(entry(3)).success).toBe(true);
    expect(journalEntrySchema.safeParse(entry(4)).success).toBe(false);
    expect(journalEntrySchema.safeParse(entry(-1)).success).toBe(false);
  });
});

describe('skin profile', () => {
  const profile = valid.profile;

  it('accepts the valid profile', () => {
    expect(skinProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('rejects an unknown base type', () => {
    expect(skinProfileSchema.safeParse({ ...profile, baseType: 'purple' }).success).toBe(false);
  });

  it('exclusive reactions cannot be combined with others', () => {
    expect(skinProfileSchema.safeParse({ ...profile, reactions: ['none_noticed'] }).success).toBe(
      true,
    );
    const mixed = { ...profile, reactions: ['none_noticed', 'unknown'] };
    expect(skinProfileSchema.safeParse(mixed).success).toBe(false);
  });

  it('"none" in avoid cannot be combined with others', () => {
    const mixed = { ...profile, avoid: ['none', 'none'] };
    expect(skinProfileSchema.safeParse({ ...profile, avoid: ['none'] }).success).toBe(true);
    expect(skinProfileSchema.safeParse(mixed).success).toBe(false);
  });

  it('revision starts at 1', () => {
    expect(skinProfileSchema.safeParse({ ...profile, revision: 0 }).success).toBe(false);
  });
});

describe('scan result', () => {
  const scan = {
    id: 'scan-1',
    productSnapshot: valid.products[0],
    checkedAt: NOW,
    status: 'insufficient_info',
    matched: [],
    warnings: [],
    unknown: ['SOMETHING'],
    insufficientInfo: [
      { id: 'obs-1', kind: 'incomplete_data', ingredientIds: [], ruleId: null, messageId: null },
    ],
    profileRevision: 1,
  };

  it('accepts a result whose observations carry ids only', () => {
    expect(scanResultSchema.safeParse(scan).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(scanResultSchema.safeParse({ ...scan, status: 'great' }).success).toBe(false);
  });
});

describe('content schemas', () => {
  const placeholder = {
    id: 'ing-1',
    source: 'test',
    reviewStatus: 'placeholder',
    inci: 'TEST',
    nameUk: null,
    aliases: [],
    groups: [],
    category: null,
    purpose: null,
    properties: [],
    cautions: [],
    usage: null,
    knownInteractions: [],
    supports: [],
  };

  it('a placeholder record has null texts and is valid', () => {
    expect(ingredientSchema.safeParse(placeholder).success).toBe(true);
  });

  it('every record needs a source and a known review status', () => {
    expect(ingredientSchema.safeParse({ ...placeholder, source: '' }).success).toBe(false);
    expect(ingredientSchema.safeParse({ ...placeholder, reviewStatus: 'maybe' }).success).toBe(
      false,
    );
  });

  it('the bundle needs all containers', () => {
    expect(contentBundleSchema.safeParse({}).success).toBe(false);
  });
});

describe('care setup, needs and routine steps (stage 5)', () => {
  it('care setup: a known scenario, a category list and the revision of the profile', () => {
    const setup = { scenario: 'partial', ownedCategories: ['moisturizer'], builtForRevision: 1 };
    expect(careSetupSchema.safeParse(setup).success).toBe(true);
    expect(
      careSetupSchema.safeParse({ scenario: null, ownedCategories: [], builtForRevision: null })
        .success,
    ).toBe(true);
    expect(careSetupSchema.safeParse({ ...setup, scenario: 'maybe' }).success).toBe(false);
    expect(careSetupSchema.safeParse({ ...setup, ownedCategories: ['soap'] }).success).toBe(false);
    expect(careSetupSchema.safeParse({ ...setup, builtForRevision: 0 }).success).toBe(false);
  });

  it('a need keeps only what the user did with it', () => {
    expect(
      shoppingNeedSchema.safeParse({ id: 'need-cleanser', done: false, dismissed: true }).success,
    ).toBe(true);
    expect(shoppingNeedSchema.safeParse({ id: 'need-cleanser', done: false }).success).toBe(false);
  });

  const stepInfo = {
    id: 'step-base-cleanser',
    source: 'test',
    reviewStatus: 'placeholder',
    kind: 'base',
    category: 'cleanser',
    slots: [],
    title: null,
    purpose: null,
    frequency: null,
    lookFor: [],
    goals: [],
    reactionGroups: [],
    avoidTags: [],
    antiAging: false,
  };

  it('a routine step record may have no texts at all (a placeholder)', () => {
    expect(routineStepInfoSchema.safeParse(stepInfo).success).toBe(true);
  });

  it('a routine step record refuses an unknown kind, slot or goal', () => {
    expect(routineStepInfoSchema.safeParse({ ...stepInfo, kind: 'extra' }).success).toBe(false);
    expect(routineStepInfoSchema.safeParse({ ...stepInfo, slots: ['noon'] }).success).toBe(false);
    expect(routineStepInfoSchema.safeParse({ ...stepInfo, goals: ['glow'] }).success).toBe(false);
  });
});
