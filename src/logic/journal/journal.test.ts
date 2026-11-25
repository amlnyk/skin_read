import { describe, expect, it } from 'vitest';
import { createRealContent } from '@/test/fakes';
import { PERSONAS } from '@/test/personas';
import type { Intensity, JournalEntry, Settings, SkinProfile, TestAnswers } from '@/types';
import { DEFAULT_JOURNAL_CONFIG } from '../config';
import { buildProfile } from '../profile';
import {
  buildEntry,
  dateAfter,
  daysAgo,
  entryHasContent,
  isInWindow,
  isSuggestionSnoozed,
  journalFieldVisibility,
  sortEntries,
  suggestProfileUpdate,
  SYMPTOM_CONDITION,
  SYMPTOM_KEYS,
  utcDate,
  withoutCyclePeriod,
  type EntryDraft,
} from './index';

// "Now" is 15 January 2026, noon (UTC).
const NOW = Date.UTC(2026, 0, 15, 12);
const bundle = createRealContent('demo').bundle;

function profileOf(answers: TestAnswers, patch: Partial<SkinProfile> = {}): SkinProfile {
  const built = buildProfile(answers, bundle, NOW, {
    id: 'profile-1',
    revision: 1,
    createdAt: '2026-01-01T12:00:00.000Z',
  });
  return { ...built.profile, ...patch };
}

const T1 = profileOf(PERSONAS.T1); // oily, breakouts, no cycle
const T2 = profileOf(PERSONAS.T2); // notices a cycle effect; has dehydrated, sensitive, breakouts
const T4 = profileOf(PERSONAS.T4); // minimum of data; stable

function entry(id: string, date: string, symptoms: JournalEntry['symptoms'] = {}): JournalEntry {
  return { id, date, symptoms, newProductIds: [], note: '' };
}

/** `count` entries on consecutive days ending `startAgo` days ago, each with the symptom at `level`. */
function marked(
  symptom: keyof JournalEntry['symptoms'],
  level: Intensity,
  agoList: number[],
): JournalEntry[] {
  return agoList.map((ago, index) =>
    entry(`e${index}`, dateAfter(NOW, -ago), { [symptom]: level }),
  );
}

const settings = (patch: Partial<Settings> = {}): Settings => ({
  consents: { photoToAi: { granted: false, at: null } },
  reminders: {
    am: { enabled: false, time: null },
    pm: { enabled: false, time: null },
    journal: { enabled: false, time: null },
  },
  cycleTrackingVisible: false,
  showShavingField: false,
  ...patch,
});

describe('suggestProfileUpdate: the rule of the plan', () => {
  it('3 entries with the same symptom: no suggestion', () => {
    expect(suggestProfileUpdate(marked('dryness', 3, [0, 2, 4]), T1, NOW)).toBeNull();
  });

  it('4 entries within 14 days: a suggestion with the matching state', () => {
    const result = suggestProfileUpdate(marked('dryness', 2, [0, 3, 6, 9]), T1, NOW);
    expect(result).toEqual({ symptoms: ['dryness'], conditions: ['dehydrated'] });
  });

  it('4 entries spread over 30 days: no suggestion', () => {
    expect(suggestProfileUpdate(marked('dryness', 3, [0, 10, 20, 30]), T1, NOW)).toBeNull();
  });

  it('intensity 3 counts the same as 2; intensity 1 and 0 do not count', () => {
    expect(suggestProfileUpdate(marked('breakouts', 3, [0, 1, 2, 3]), T4, NOW)).not.toBeNull();
    expect(suggestProfileUpdate(marked('breakouts', 1, [0, 1, 2, 3]), T4, NOW)).toBeNull();
    expect(suggestProfileUpdate(marked('breakouts', 0, [0, 1, 2, 3]), T4, NOW)).toBeNull();
  });

  it('the symptom is counted on its own: 2 of one and 2 of another make no suggestion', () => {
    const mixed = [...marked('dryness', 3, [0, 1]), ...marked('redness', 3, [2, 3])];
    expect(suggestProfileUpdate(mixed, T4, NOW)).toBeNull();
  });

  it('the matching state is already in the profile: no suggestion', () => {
    // T2 has "breakouts", "sensitive" and "dehydrated"
    expect(suggestProfileUpdate(marked('breakouts', 3, [0, 1, 2, 3]), T2, NOW)).toBeNull();
    expect(suggestProfileUpdate(marked('flaking', 3, [0, 1, 2, 3]), T2, NOW)).toBeNull();
  });

  it('oiliness has no matching state, so it never starts a question', () => {
    expect(SYMPTOM_CONDITION.oiliness).toBeNull();
    expect(suggestProfileUpdate(marked('oiliness', 3, [0, 1, 2, 3, 4, 5]), T4, NOW)).toBeNull();
  });

  it('two symptoms with the same state give that state once', () => {
    const both = [...marked('dryness', 3, [0, 1, 2, 3]), ...marked('flaking', 2, [4, 5, 6, 7])];
    expect(suggestProfileUpdate(both, T4, NOW)).toEqual({
      symptoms: ['dryness', 'flaking'],
      conditions: ['dehydrated'],
    });
  });

  it('several symptoms come in the fixed order', () => {
    const several = [
      ...marked('breakouts', 3, [0, 1, 2, 3]),
      ...marked('dryness', 3, [0, 1, 2, 3]),
    ];
    expect(suggestProfileUpdate(several, T4, NOW)?.symptoms).toEqual(['dryness', 'breakouts']);
  });

  it('without a profile there is nothing to update', () => {
    expect(suggestProfileUpdate(marked('dryness', 3, [0, 1, 2, 3]), null, NOW)).toBeNull();
  });

  it('no entries: nothing', () => {
    expect(suggestProfileUpdate([], T4, NOW)).toBeNull();
  });

  it('the thresholds come from the config', () => {
    const three = marked('dryness', 2, [0, 1, 2]);
    expect(
      suggestProfileUpdate(three, T4, NOW, { ...DEFAULT_JOURNAL_CONFIG, minEntries: 3 }),
    ).not.toBeNull();
    const old = marked('dryness', 2, [20, 21, 22, 23]);
    expect(
      suggestProfileUpdate(old, T4, NOW, { ...DEFAULT_JOURNAL_CONFIG, windowDays: 30 }),
    ).not.toBeNull();
    const weak = marked('dryness', 1, [0, 1, 2, 3]);
    expect(
      suggestProfileUpdate(weak, T4, NOW, { ...DEFAULT_JOURNAL_CONFIG, minIntensity: 1 }),
    ).not.toBeNull();
  });

  it('does not change what it is given', () => {
    const list = marked('dryness', 3, [0, 1, 2, 3]);
    const copy = JSON.parse(JSON.stringify(list)) as JournalEntry[];
    suggestProfileUpdate(list, T4, NOW);
    expect(list).toEqual(copy);
  });
});

describe('the window of 14 days', () => {
  it('today and 13 days ago are in; 14 days ago is out', () => {
    expect(isInWindow('2026-01-15', NOW, 14)).toBe(true);
    expect(isInWindow('2026-01-02', NOW, 14)).toBe(true);
    expect(isInWindow('2026-01-01', NOW, 14)).toBe(false);
  });

  it('a user east of UTC may already be on the next day: that entry counts, a later one does not', () => {
    expect(isInWindow('2026-01-16', NOW, 14)).toBe(true);
    expect(isInWindow('2026-01-17', NOW, 14)).toBe(false);
  });

  it('daysAgo counts whole days', () => {
    expect(daysAgo('2026-01-15', NOW)).toBe(0);
    expect(daysAgo('2026-01-14', NOW)).toBe(1);
    expect(daysAgo('2026-01-16', NOW)).toBe(-1);
  });

  it('the date helpers work in UTC and cross month ends', () => {
    expect(utcDate(NOW)).toBe('2026-01-15');
    expect(dateAfter(NOW, 7)).toBe('2026-01-22');
    expect(dateAfter(NOW, -15)).toBe('2025-12-31');
  });
});

describe('"not now"', () => {
  it('is in force before the saved day and over on it', () => {
    expect(isSuggestionSnoozed('2026-01-22', '2026-01-15')).toBe(true);
    expect(isSuggestionSnoozed('2026-01-22', '2026-01-21')).toBe(true);
    expect(isSuggestionSnoozed('2026-01-22', '2026-01-22')).toBe(false);
  });

  it('nothing saved: not snoozed', () => {
    expect(isSuggestionSnoozed(null, '2026-01-15')).toBe(false);
    expect(isSuggestionSnoozed(undefined, '2026-01-15')).toBe(false);
  });
});

describe('which fields of the entry form are shown', () => {
  it('T4 (the cycle is declined): no cycle field, no shaving field', () => {
    expect(journalFieldVisibility(T4, settings())).toEqual({
      cyclePeriod: false,
      shavingIrritation: false,
    });
  });

  it('T1 (the cycle is not relevant): no cycle field', () => {
    expect(journalFieldVisibility(T1, settings()).cyclePeriod).toBe(false);
  });

  it('T2 (notices a cycle effect): the cycle field is shown', () => {
    expect(T2.cycle.status).toBe('noticed');
    expect(journalFieldVisibility(T2, settings()).cyclePeriod).toBe(true);
  });

  it('the setting shows the cycle field to anyone who switched it on', () => {
    expect(journalFieldVisibility(T4, settings({ cycleTrackingVisible: true })).cyclePeriod).toBe(
      true,
    );
    expect(journalFieldVisibility(null, settings({ cycleTrackingVisible: true })).cyclePeriod).toBe(
      true,
    );
  });

  it('without a profile and without the setting: no cycle field', () => {
    expect(journalFieldVisibility(null, settings()).cyclePeriod).toBe(false);
  });

  it('the shaving field follows its own setting only', () => {
    expect(journalFieldVisibility(T2, settings({ showShavingField: true })).shavingIrritation).toBe(
      true,
    );
    expect(journalFieldVisibility(T4, settings({ showShavingField: true })).shavingIrritation).toBe(
      true,
    );
    expect(journalFieldVisibility(T2, settings()).shavingIrritation).toBe(false);
  });
});

const EMPTY: EntryDraft = { date: '2026-01-15', symptoms: {}, newProductIds: [], note: '' };
const ALL_VISIBLE = { cyclePeriod: true, shavingIrritation: true };
const NONE_VISIBLE = { cyclePeriod: false, shavingIrritation: false };

describe('an entry', () => {
  it('the date alone is not a record', () => {
    expect(entryHasContent(EMPTY)).toBe(false);
    expect(entryHasContent({ ...EMPTY, note: '   ' })).toBe(false);
  });

  it.each<[string, Partial<EntryDraft>]>([
    ['the feeling', { feeling: 'good' }],
    ['one symptom', { symptoms: { dryness: 1 } }],
    ['a symptom marked "none" (0)', { symptoms: { redness: 0 } }],
    ['a new product', { newProductIds: ['p1'] }],
    ['shaving irritation', { shavingIrritation: 2 }],
    ['the cycle period', { cyclePeriod: 'unknown' }],
    ['a note', { note: 'x' }],
  ])('one filled field is enough: %s', (_name, patch) => {
    expect(entryHasContent({ ...EMPTY, ...patch })).toBe(true);
  });

  it('saves only what is filled, with the given id', () => {
    const saved = buildEntry(
      { ...EMPTY, symptoms: { dryness: 2 }, note: ' hello ' },
      'e-1',
      NONE_VISIBLE,
    );
    expect(saved).toEqual({
      id: 'e-1',
      date: '2026-01-15',
      symptoms: { dryness: 2 },
      newProductIds: [],
      note: 'hello',
    });
  });

  it('a field that is not shown never reaches the journal', () => {
    const draft = {
      ...EMPTY,
      cyclePeriod: 'pre_menstrual' as const,
      shavingIrritation: 3 as const,
    };
    const hidden = buildEntry(draft, 'e-1', NONE_VISIBLE);
    expect(hidden).not.toHaveProperty('cyclePeriod');
    expect(hidden).not.toHaveProperty('shavingIrritation');
    const shown = buildEntry(draft, 'e-1', ALL_VISIBLE);
    expect(shown.cyclePeriod).toBe('pre_menstrual');
    expect(shown.shavingIrritation).toBe(3);
  });

  it('keeps the symptoms in the shape of the schema', () => {
    const symptoms = Object.fromEntries(
      SYMPTOM_KEYS.map((key) => [key, 1]),
    ) as EntryDraft['symptoms'];
    expect(Object.keys(buildEntry({ ...EMPTY, symptoms }, 'e', NONE_VISIBLE).symptoms)).toEqual([
      ...SYMPTOM_KEYS,
    ]);
  });

  it('newest day first; the same day: the later one first; the input is not changed', () => {
    const list = [entry('a', '2026-01-10'), entry('b', '2026-01-12'), entry('c', '2026-01-10')];
    expect(sortEntries(list).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(list.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('takes the cycle period out of old entries and leaves the rest', () => {
    const list: JournalEntry[] = [
      { ...entry('a', '2026-01-10'), cyclePeriod: 'pre_menstrual', note: 'keep me' },
      entry('b', '2026-01-11'),
    ];
    const cleaned = withoutCyclePeriod(list);
    expect(cleaned[0]).toEqual({ ...entry('a', '2026-01-10'), note: 'keep me' });
    expect(cleaned[0]).not.toHaveProperty('cyclePeriod');
    expect(cleaned[1]).toBe(list[1]);
    expect(list[0]?.cyclePeriod).toBe('pre_menstrual');
  });
});
