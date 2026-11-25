import { describe, expect, it } from 'vitest';
import { OBSERVATION_TEMPLATE_IDS, QUESTION_IDS } from '@/schemas';
import raw from './observation-templates.json';
import { loadBundledContent } from './bundled';

// The real files of src/content go through the same loader as in the app.
describe('bundled content', () => {
  it.each(['demo', 'public'] as const)('loads and validates in %s mode', (policy) => {
    expect(loadBundledContent(policy).ok).toBe(true);
  });

  it('placeholders are never shown, whatever the policy', () => {
    for (const policy of ['demo', 'public'] as const) {
      const result = loadBundledContent(policy);
      if (!result.ok) throw new Error('content must load');
      for (const list of Object.values(result.value.bundle)) {
        for (const record of list as { reviewStatus: string }[]) {
          expect(record.reviewStatus).not.toBe('placeholder');
        }
      }
    }
  });

  it('the questionnaire (draft texts from the spec) is shown in demo and hidden in public', () => {
    const demo = loadBundledContent('demo');
    const publicMode = loadBundledContent('public');
    if (!demo.ok || !publicMode.ok) throw new Error('content must load');
    expect(demo.value.bundle.questionnaire.map((q) => q.id)).toEqual(Object.values(QUESTION_IDS));
    expect(publicMode.value.bundle.questionnaire).toEqual([]);
  });

  it('has the 23 groups of the spec, the preference groups and no invented ingredients', () => {
    const demo = loadBundledContent('demo');
    const publicMode = loadBundledContent('public');
    if (!demo.ok || !publicMode.ok) throw new Error('content must load');
    const ids = demo.value.bundle.ingredientGroups.map((group) => group.id);
    // 24 groups: "alcohols" of the spec are two groups (denatured and fatty), plus 3 preference groups
    expect(ids).toEqual([
      'aha',
      'bha',
      'pha',
      'retinoids',
      'niacinamide',
      'azelaic_acid',
      'vitamin_c',
      'hyaluronic_acid',
      'glycerin',
      'ceramides',
      'panthenol',
      'squalane',
      'peptides',
      'zinc',
      'allantoin',
      'beta_glucan',
      'antioxidants',
      'surfactants',
      'fragrance',
      'essential_oils',
      'alcohol_denat',
      'fatty_alcohols',
      'preservatives',
      'sunscreen_filters',
      'silicones',
      'sulfates',
      'parabens',
    ]);
    // the list of comedogenic oils is not given: the group is a placeholder and is hidden
    expect(ids).not.toContain('comedogenic_oils');
    // the cosmetologist has given no ingredient records yet: nothing is shown, nothing is invented
    expect(demo.value.bundle.ingredients).toEqual([]);
    expect(publicMode.value.bundle.ingredientGroups).toEqual([]);
  });

  it('every group has a source and a Ukrainian name, and the recognition patterns are drafts', () => {
    const demo = loadBundledContent('demo');
    if (!demo.ok) throw new Error('content must load');
    const groups = demo.value.bundle.ingredientGroups;
    for (const group of groups) {
      expect(group.source.length).toBeGreaterThan(0);
      expect(group.nameUk).not.toBeNull();
      // descriptions come from the cosmetologist: none is invented
      expect(group.description).toBeNull();
      if (group.patterns.length > 0) expect(group.reviewStatus).toBe('draft');
    }
    const patterns = (id: string) => groups.find((group) => group.id === id)?.patterns;
    expect(patterns('silicones')).toEqual(['*cone', '*siloxane']);
    expect(patterns('sulfates')).toEqual(['sodium lauryl sulfate', 'sodium laureth sulfate']);
    expect(patterns('parabens')).toEqual(['*paraben']);
    expect(patterns('fragrance')).toEqual(['parfum', 'fragrance', 'aroma']);
    // fatty alcohols are their own group and never match the denatured alcohol
    expect(patterns('fatty_alcohols')).toEqual([
      'cetyl alcohol',
      'cetearyl alcohol',
      'stearyl alcohol',
      'behenyl alcohol',
    ]);
    expect(patterns('alcohol_denat')).toEqual([]);
  });

  it('every template of the routine analysis has a record in the file, and no text is invented', () => {
    type Template = { id: string; text: string | null; why: string | null; reviewStatus: string };
    const records: Template[] = raw.items;
    const ids = records.map((record) => record.id);
    for (const id of Object.values(OBSERVATION_TEMPLATE_IDS)) expect(ids, id).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    // a text is there only when it came from the spec (draft); the rest waits for the cosmetologist
    for (const record of records) {
      if (record.reviewStatus === 'placeholder') {
        expect(record.text).toBeNull();
        expect(record.why).toBeNull();
      }
    }
    const filled = records
      .filter((record) => record.text !== null)
      .map((record) => record.id)
      .sort();
    expect(filled).toEqual(['obs-many-actives-sensitive', 'obs-missing-sunscreen']);
  });

  it('the two examples of the spec are in the content as drafts, word for word', () => {
    const demo = loadBundledContent('demo');
    const publicMode = loadBundledContent('public');
    if (!demo.ok || !publicMode.ok) throw new Error('content must load');
    const byId = (id: string) =>
      demo.value.bundle.observationTemplates.find((record) => record.id === id);
    expect(byId('obs-missing-sunscreen')?.text).toBe(
      'У твоїй ранковій рутині не зазначено сонцезахисний засіб.',
    );
    const many = byId('obs-many-actives-sensitive');
    expect(`${many?.text} ${many?.why}`).toBe(
      'У твоїй рутині є декілька засобів із відлущувальними компонентами. Одночасне використання може підвищувати ризик подразнення, особливо з урахуванням зазначеної чутливості шкіри.',
    );
    // not verified yet: hidden in the public mode, placeholders hidden everywhere
    expect(publicMode.value.bundle.observationTemplates).toEqual([]);
    expect(demo.value.bundle.observationTemplates).toHaveLength(2);
  });
});
