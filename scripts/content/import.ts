// The cosmetologist's tables -> content files. Usage:
//   npm run content:import              check the tables and write the three JSON files
//   npm run content:import -- --check   only check; also says whether the JSON files are up to date
//
// Tables: content/cosmetologist/ingredients.csv, compat-rules.csv, groups.csv (Excel or Google
// Sheets, saved as CSV). Writes src/content/data/ingredients.json, compat-rules.json and
// ingredient-groups.json. Nothing is written when anything is wrong: every error names the
// table and the line. After the import the usual content audit runs on the result too.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { auditContent } from '../../src/content/audit';
import { CONTENT_FILES, SINGLE_RECORD_FILES } from '../../src/content/files';
import { buildDictionaries } from '../../src/content/import/dictionaries';
import { importSheets } from '../../src/content/import/importSheets';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tables = join(root, 'content', 'cosmetologist');
const contentDir = join(root, 'src', 'content', 'data');
const checkOnly = process.argv.includes('--check');

const read = (path: string) => readFileSync(path, 'utf8');
const readJson = (file: string): unknown => JSON.parse(read(join(contentDir, file)));

for (const file of ['ingredients.csv', 'compat-rules.csv', 'groups.csv']) {
  if (!existsSync(join(tables, file))) {
    console.error(`ПОМИЛКА: немає таблиці content/cosmetologist/${file}`);
    process.exit(1);
  }
}

const result = importSheets(
  {
    ingredients: read(join(tables, 'ingredients.csv')),
    rules: read(join(tables, 'compat-rules.csv')),
    groups: read(join(tables, 'groups.csv')),
  },
  buildDictionaries(readJson('questionnaire.json'), readJson('conditions.json')),
);

for (const warning of result.warnings) console.log(`Увага: ${warning}`);
if (!result.ok) {
  for (const error of result.errors) console.error(`ПОМИЛКА: ${error}`);
  console.error(
    `\nЗнайдено помилок: ${result.errors.length}. Нічого не записано. Виправ таблиці й запусти ще раз.`,
  );
  process.exit(1);
}

const generated: Record<string, unknown> = {
  'ingredients.json': { items: result.ingredients },
  'compat-rules.json': { items: result.compatRules },
  'ingredient-groups.json': { items: result.groups },
};

// The audit sees the whole content as it would be after writing (schemas, references, names).
const raw: Record<string, unknown> = {};
for (const { file } of [...CONTENT_FILES, ...SINGLE_RECORD_FILES]) {
  raw[file] = generated[file] ?? readJson(file);
}
const report = auditContent(raw);
if (report.errors.length > 0) {
  for (const error of report.errors) console.error(`ПОМИЛКА (аудит): ${error}`);
  console.error('\nНічого не записано.');
  process.exit(1);
}

const count = (status: string) =>
  [...result.ingredients, ...result.compatRules, ...result.groups].filter(
    (item) => item.reviewStatus === status,
  ).length;
console.log(
  `Компонентів: ${result.ingredients.length}, правил сумісності: ${result.compatRules.length}, груп: ${result.groups.length}.`,
);
console.log(
  `Перевірено: ${count('verified')}, чернеток: ${count('draft')}, заготовок: ${count('placeholder')}.`,
);

const sameAsFile = (file: string) =>
  JSON.stringify(readJson(file)) === JSON.stringify(generated[file]);

if (checkOnly) {
  const stale = Object.keys(generated).filter((file) => !sameAsFile(file));
  if (stale.length > 0) {
    console.error(
      `Таблиці правильні, але файли застаріли: ${stale.join(', ')}. Запусти npm run content:import.`,
    );
    process.exit(1);
  }
  console.log('Таблиці правильні, файли актуальні.');
} else {
  for (const [file, data] of Object.entries(generated)) {
    const path = join(contentDir, file);
    // the same formatting as the rest of the project, so npm run check stays green
    const options = (await resolveConfig(path)) ?? {};
    writeFileSync(path, await format(JSON.stringify(data), { ...options, parser: 'json' }), 'utf8');
  }
  console.log('Записано: ingredients.json, compat-rules.json, ingredient-groups.json.');
  console.log(
    'Не забудь: підняти contentVersion у src/content/data/version.json і запустити npm run check.',
  );
}
