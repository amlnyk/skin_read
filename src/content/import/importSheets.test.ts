import { describe, expect, it } from 'vitest';
import { GROUP_COLUMNS, INGREDIENT_COLUMNS, RULE_COLUMNS } from './columns';
import { parseCsv, toCsv } from './csv';
import { importSheets, splitList, type Dictionaries } from './importSheets';

// Invented rows: they test the import, they are not content.

const dict: Dictionaries = {
  conditions: [
    { id: 'sensitive', labels: ['Чутлива'] },
    { id: 'reactive', labels: ['Реактивна'] },
  ],
  goals: [{ id: 'hydrate', labels: ['Зволожити шкіру'] }],
  reactions: [{ id: 'acids', labels: ['Кислоти AHA, BHA, PHA'] }],
};

const G = GROUP_COLUMNS;
const I = INGREDIENT_COLUMNS;
const R = RULE_COLUMNS;

function table(columns: Record<string, string>, rows: Record<string, string>[]) {
  const header = Object.values(columns);
  return toCsv([header, ...rows.map((row) => header.map((title) => row[title] ?? ''))]);
}

const groups = (rows: Record<string, string>[] = []) =>
  table(G, [
    {
      [G.id]: 'test_acids',
      [G.nameUk]: 'Тестові кислоти',
      [G.source]: 'тест',
      [G.status]: 'перевірено',
    },
    {
      [G.id]: 'test_soft',
      [G.nameUk]: 'Тестові пом’якшувачі',
      [G.source]: 'тест',
      [G.status]: 'чернетка',
    },
    ...rows,
  ]);
const ingredients = (rows: Record<string, string>[]) => table(I, rows);
const rules = (rows: Record<string, string>[] = []) => table(R, rows);

const run = (sheets: { ingredients?: string; rules?: string; groups?: string }) =>
  importSheets(
    {
      ingredients: sheets.ingredients ?? ingredients([]),
      rules: sheets.rules ?? rules(),
      groups: sheets.groups ?? groups(),
    },
    dict,
  );

const acid = {
  [I.inci]: 'Test Acid',
  [I.nameUk]: 'Тестова кислота',
  [I.groups]: 'Тестові кислоти',
};
const verifiedAcid = {
  ...acid,
  [I.purpose]: 'тестовий текст',
  [I.source]: 'тест',
  [I.status]: 'перевірено',
};
const soft = {
  [I.inci]: 'Test Softener',
  [I.nameUk]: 'Тестовий пом’якшувач',
  [I.aliases]: 'Softener T | TS-1',
};

const errorsOf = (result: ReturnType<typeof run>) => (result.ok ? [] : result.errors);

describe('parseCsv', () => {
  it('reads ";" with a BOM, quotes, doubled quotes and line breaks inside a cell', () => {
    const rows = parseCsv('\uFEFFa;b;c\r\n1;"x; y";"say ""hi"""\r\n2;"line\nbreak";\r\n\r\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x; y', 'say "hi"'],
      ['2', 'line\nbreak', ''],
    ]);
  });

  it('reads "," from Google Sheets', () => {
    expect(parseCsv('a,b\n"1,5",2\n')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
  });

  it('writes what it reads', () => {
    const rows = [
      ['id', 'Назва'],
      ['x', 'з ; і "лапками"'],
      ['y', '1,3-Propanediol'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('splits a list by "|" or by line breaks', () => {
    expect(splitList(' a | b\nc ||')).toEqual(['a', 'b', 'c']);
  });
});

describe('importSheets: components', () => {
  it('makes a draft with an id from the INCI, groups found by their Ukrainian name, and null texts', () => {
    const result = run({ ingredients: ingredients([acid, soft]) });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.ingredients[0]).toEqual({
      id: 'ing-test-acid',
      source: 'таблиця косметолога',
      reviewStatus: 'draft',
      inci: 'Test Acid',
      nameUk: 'Тестова кислота',
      aliases: [],
      groups: ['test_acids'],
      category: null,
      purpose: null,
      properties: [],
      cautions: [],
      usage: null,
      knownInteractions: [],
      supports: [],
    });
    expect(result.ingredients[1]?.aliases).toEqual(['Softener T', 'TS-1']);
  });

  it('a verified component needs a name, "Для чого" and a source', () => {
    const errors = errorsOf(
      run({ ingredients: ingredients([{ ...acid, [I.status]: 'перевірено' }]) }),
    );
    expect(errors.some((error) => error.includes('«Для чого»'))).toBe(true);
    expect(errors.some((error) => error.includes('«Джерело»'))).toBe(true);
    expect(errors[0]).toContain('рядок 2');
  });

  it('cautions: the states by id or by name; states without a text are an error', () => {
    const ok = run({
      ingredients: ingredients([
        {
          ...acid,
          [I.caution1]: 'тестове застереження',
          [I.caution1For]: 'Чутлива | reactive',
          [I.caution2]: 'для всіх',
        },
      ]),
    });
    if (!ok.ok) throw new Error(ok.errors.join('\n'));
    expect(ok.ingredients[0]?.cautions).toEqual([
      { conditions: ['sensitive', 'reactive'], text: 'тестове застереження' },
      { conditions: [], text: 'для всіх' },
    ]);
    const bad = errorsOf(
      run({ ingredients: ingredients([{ ...acid, [I.caution1For]: 'Чутлива' }]) }),
    );
    expect(bad.some((error) => error.includes('тексту застереження немає'))).toBe(true);
  });

  it('a name that is not known is an error, never a silent skip', () => {
    const errors = errorsOf(
      run({
        ingredients: ingredients([
          {
            ...acid,
            [I.groups]: 'Нема такої групи',
            [I.caution1]: 'т',
            [I.caution1For]: 'Суха',
            [I.supports]: 'Схуднути',
          },
        ]),
      }),
    );
    expect(errors.some((error) => error.includes('групу «Нема такої групи»'))).toBe(true);
    expect(errors.some((error) => error.includes('стан шкіри «Суха»'))).toBe(true);
    expect(errors.some((error) => error.includes('ціль «Схуднути»'))).toBe(true);
  });

  it('two components may not share a name or a synonym', () => {
    const errors = errorsOf(
      run({ ingredients: ingredients([soft, { [I.inci]: 'Other', [I.aliases]: 'softener t' }]) }),
    );
    expect(errors.some((error) => error.includes('«softener t»'))).toBe(true);
  });

  it('known interactions point to other components by INCI or synonym', () => {
    const result = run({ ingredients: ingredients([{ ...acid, [I.interactions]: 'TS-1' }, soft]) });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.ingredients[0]?.knownInteractions).toEqual(['ing-test-softener']);
  });

  it('a wrong status word, a missing column and an unknown column are reported', () => {
    expect(
      errorsOf(run({ ingredients: ingredients([{ ...acid, [I.status]: 'готово' }]) }))[0],
    ).toContain('статус «готово»');
    const noPurpose = toCsv([
      [I.inci, I.nameUk],
      ['Test', 'Тест'],
    ]);
    expect(
      errorsOf(run({ ingredients: noPurpose })).some((error) => error.includes('«Для чого»')),
    ).toBe(true);
    const extra = table({ ...I, extra: 'Зайвий стовпець' }, [acid]);
    const result = run({ ingredients: extra });
    expect(result.warnings.some((warning) => warning.includes('Зайвий стовпець'))).toBe(true);
  });
});

describe('importSheets: compatibility rules', () => {
  const rule = (row: Record<string, string>) =>
    run({ ingredients: ingredients([verifiedAcid, soft]), rules: rules([row]) });

  it('a component by INCI and a group by its Ukrainian name; empty "same time" means always', () => {
    const result = rule({
      [R.a]: 'Test Acid',
      [R.b]: 'Тестові пом’якшувачі',
      [R.level]: 'обережно',
    });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.compatRules[0]).toMatchObject({
      id: 'rule-ing-test-acid--test-soft',
      a: { kind: 'ingredient', id: 'ing-test-acid' },
      b: { kind: 'group', id: 'test_soft' },
      level: 'caution',
      sameSlotOnly: false,
      reviewStatus: 'draft',
      priority: 0,
    });
    expect(result.compatRules[0]).not.toHaveProperty('escalateWhen');
  });

  it('escalation by states and reactions', () => {
    const result = rule({
      [R.a]: 'Test Acid',
      [R.b]: 'TS-1',
      [R.level]: 'інформація',
      [R.escalateConditions]: 'Чутлива',
      [R.escalateReactions]: 'Кислоти AHA, BHA, PHA',
      [R.sameSlotOnly]: 'так',
    });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.compatRules[0]).toMatchObject({
      level: 'info',
      sameSlotOnly: true,
      escalateWhen: { conditions: ['sensitive'], reactions: ['acids'] },
    });
  });

  it('a verified rule needs an explanation, a source and verified components', () => {
    const errors = errorsOf(
      rule({
        [R.a]: 'Test Acid',
        [R.b]: 'Test Softener',
        [R.level]: 'обережно',
        [R.status]: 'перевірено',
      }),
    );
    expect(errors.some((error) => error.includes('«Пояснення»'))).toBe(true);
    expect(errors.some((error) => error.includes('неперевірене «ing-test-softener»'))).toBe(true);
    expect(errors.some((error) => error.includes('неперевірене «ing-test-acid»'))).toBe(false);
  });

  it('refuses a rule of a thing with itself, a second rule for the same pair and an unknown name', () => {
    expect(
      errorsOf(rule({ [R.a]: 'Test Acid', [R.b]: 'test acid', [R.level]: 'обережно' }))[0],
    ).toContain('саме з собою');
    const twice = run({
      ingredients: ingredients([acid, soft]),
      rules: rules([
        { [R.a]: 'Test Acid', [R.b]: 'Test Softener', [R.level]: 'обережно' },
        { [R.a]: 'TS-1', [R.b]: 'Test Acid', [R.level]: 'інформація' },
      ]),
    });
    expect(errorsOf(twice).some((error) => error.includes('правило вже є'))).toBe(true);
    expect(
      errorsOf(rule({ [R.a]: 'Test Acid', [R.b]: 'Ghost', [R.level]: 'обережно' }))[0],
    ).toContain('«Ghost» не знайдено');
  });

  it('the level must be given', () => {
    expect(errorsOf(rule({ [R.a]: 'Test Acid', [R.b]: 'Test Softener' }))[0]).toContain('«Рівень»');
  });

  it('"група:" and "компонент:" settle a name that is both', () => {
    const both = groups([{ [G.id]: 'test_one', [G.nameUk]: 'Test Acid' }]);
    const ambiguous = run({
      ingredients: ingredients([acid, soft]),
      groups: both,
      rules: rules([{ [R.a]: 'Test Acid', [R.b]: 'TS-1', [R.level]: 'обережно' }]),
    });
    expect(errorsOf(ambiguous)[0]).toContain('і групою, і компонентом');
    const settled = run({
      ingredients: ingredients([acid, soft]),
      groups: both,
      rules: rules([{ [R.a]: 'група: Test Acid', [R.b]: 'TS-1', [R.level]: 'обережно' }]),
    });
    if (!settled.ok) throw new Error(settled.errors.join('\n'));
    expect(settled.compatRules[0]?.a).toEqual({ kind: 'group', id: 'test_one' });
  });
});

describe('importSheets: groups', () => {
  it('"Активна група" так/ні/empty, patterns as a list', () => {
    const result = run({
      groups: groups([
        { [G.id]: 'a1', [G.nameUk]: 'А1', [G.active]: 'так', [G.patterns]: '*ate | x' },
        { [G.id]: 'a2', [G.nameUk]: 'А2', [G.active]: 'ні' },
      ]),
    });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.groups.find((group) => group.id === 'a1')).toMatchObject({
      active: true,
      patterns: ['*ate', 'x'],
    });
    expect(result.groups.find((group) => group.id === 'a2')?.active).toBe(false);
    expect(result.groups.find((group) => group.id === 'test_acids')).not.toHaveProperty('active');
    expect(
      errorsOf(run({ groups: groups([{ [G.id]: 'a3', [G.active]: 'можливо' }]) }))[0],
    ).toContain('Активна група');
  });
});
