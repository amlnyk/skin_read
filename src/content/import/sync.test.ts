import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUESTION_IDS } from '@/schemas';
import { GROUP_COLUMNS, INGREDIENT_COLUMNS, RULE_COLUMNS } from './columns';
import { parseCsv } from './csv';
import { buildDictionaries } from './dictionaries';
import { importSheets } from './importSheets';

// The cosmetologist's tables and the content files must say the same. If this fails, someone
// changed a table without running `npm run content:import` (or changed a JSON file by hand).

const root = process.cwd();
const table = (file: string) => readFileSync(join(root, 'content', 'cosmetologist', file), 'utf8');
const json = (file: string) =>
  JSON.parse(readFileSync(join(root, 'src', 'content', file), 'utf8')) as { items: unknown[] };

describe('content/cosmetologist tables', () => {
  it('have the expected columns', () => {
    expect(parseCsv(table('ingredients.csv'))[0]).toEqual(Object.values(INGREDIENT_COLUMNS));
    expect(parseCsv(table('compat-rules.csv'))[0]).toEqual(Object.values(RULE_COLUMNS));
    expect(parseCsv(table('groups.csv'))[0]).toEqual(Object.values(GROUP_COLUMNS));
  });

  it('import without errors and match the JSON files (run npm run content:import after editing them)', () => {
    const result = importSheets(
      {
        ingredients: table('ingredients.csv'),
        rules: table('compat-rules.csv'),
        groups: table('groups.csv'),
      },
      buildDictionaries(json('questionnaire.json'), json('conditions.json')),
    );
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.ingredients).toEqual(json('ingredients.json').items);
    expect(result.compatRules).toEqual(json('compat-rules.json').items);
    expect(result.groups).toEqual(json('ingredient-groups.json').items);
  });

  it('the dictionaries are read from the questions the app really asks', () => {
    const dict = buildDictionaries(json('questionnaire.json'), json('conditions.json'));
    expect(QUESTION_IDS.conditions).toBe('q2_conditions');
    expect(QUESTION_IDS.goals).toBe('q3_goals');
    expect(QUESTION_IDS.reactions).toBe('q4_reactions');
    expect(dict.conditions.map((entry) => entry.id)).toContain('sensitive');
    expect(dict.goals.map((entry) => entry.id)).toContain('hydrate');
    expect(dict.reactions.map((entry) => entry.id)).not.toContain('none_noticed');
  });
});
