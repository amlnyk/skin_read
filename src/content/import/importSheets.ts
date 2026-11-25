import type { CompatibilityRule, Ingredient, IngredientGroup, ReviewStatus } from '@/schemas';
import { normalizeName } from '../normalizeName';
import { GROUP_COLUMNS, INGREDIENT_COLUMNS, OPTIONAL_COLUMNS, RULE_COLUMNS } from './columns';
import { parseCsv } from './csv';

// The cosmetologist's three tables (CSV) become ingredients.json, compat-rules.json and
// ingredient-groups.json. Pure: the script reads and writes the files.
//
// Safety rules, besides the schema and the audit that run after this:
// - "перевірено" (verified) needs the texts a person relies on: a name and "Для чого" for a
//   component, an explanation for a rule, and a source for every one of them;
// - a verified rule may only connect verified components or groups (otherwise the public mode
//   would show a rule about something it hides);
// - every name in a cell must be known: a group, a skin state, a goal, a reaction, a component.
//   A typo is an error, never a silent skip;
// - nothing is written when there is any error (the script checks `ok`).

export type Dictionary = readonly { readonly id: string; readonly labels: readonly string[] }[];

export type Dictionaries = {
  readonly conditions: Dictionary;
  readonly goals: Dictionary;
  readonly reactions: Dictionary;
};

export type Sheets = {
  readonly ingredients: string;
  readonly rules: string;
  readonly groups: string;
};

export type ImportOk = {
  readonly ok: true;
  readonly ingredients: Ingredient[];
  readonly compatRules: CompatibilityRule[];
  readonly groups: IngredientGroup[];
  readonly warnings: string[];
};
export type ImportFailed = {
  readonly ok: false;
  readonly errors: string[];
  readonly warnings: string[];
};
export type ImportResult = ImportOk | ImportFailed;

const SHEET = {
  ingredients: 'ingredients.csv',
  rules: 'compat-rules.csv',
  groups: 'groups.csv',
} as const;

const STATUS_WORDS: Readonly<Record<string, ReviewStatus>> = {
  перевірено: 'verified',
  verified: 'verified',
  чернетка: 'draft',
  draft: 'draft',
  заготовка: 'placeholder',
  placeholder: 'placeholder',
};

const YES = new Set(['так', 'yes', 'true', '1', '+']);
const NO = new Set(['ні', 'no', 'false', '0', '-']);

const LEVEL_WORDS: Readonly<Record<string, CompatibilityRule['level']>> = {
  обережно: 'caution',
  caution: 'caution',
  інформація: 'info',
  info: 'info',
};

/** Several values in one cell: separated by "|" or by line breaks (Alt+Enter in Excel). */
export function splitList(cell: string): string[] {
  return cell
    .split(/\r?\n|\|/)
    .map((value) => value.trim())
    .filter((value) => value !== '');
}

const slug = (value: string) => normalizeName(value).replace(/ /g, '-');

type Table = { rows: { line: number; get: (column: string) => string }[] };

function readTable(
  name: string,
  text: string,
  columns: Readonly<Record<string, string>>,
  errors: string[],
  warnings: string[],
): Table {
  const rows = parseCsv(text);
  const header = (rows[0] ?? []).map((title) => title.trim());
  const expected = Object.values(columns);
  for (const title of expected) {
    if (!OPTIONAL_COLUMNS.has(title) && !header.includes(title)) {
      errors.push(`${name}: немає стовпця «${title}» у першому рядку`);
    }
  }
  for (const title of header) {
    if (title !== '' && !expected.includes(title)) {
      warnings.push(`${name}: стовпець «${title}» невідомий, його пропущено`);
    }
  }
  return {
    rows: rows.slice(1).map((cells, index) => ({
      // the line as the spreadsheet shows it: the header is line 1
      line: index + 2,
      get: (column: string) => {
        const at = header.indexOf(column);
        return at < 0 ? '' : (cells[at] ?? '').trim();
      },
    })),
  };
}

const textOrNull = (value: string): string | null => (value === '' ? null : value);

function statusOf(value: string, where: string, errors: string[]): ReviewStatus {
  if (value === '') return 'draft';
  const status = STATUS_WORDS[value.toLowerCase()];
  if (!status) {
    errors.push(`${where}: статус «${value}» невідомий (можна: перевірено, чернетка, заготовка)`);
    return 'draft';
  }
  return status;
}

function makeLookup(dictionary: Dictionary) {
  const byName = new Map<string, string>();
  for (const entry of dictionary) {
    byName.set(normalizeName(entry.id), entry.id);
    for (const label of entry.labels) byName.set(normalizeName(label), entry.id);
  }
  return (value: string) => byName.get(normalizeName(value)) ?? null;
}

function resolveAll(
  values: readonly string[],
  lookup: (value: string) => string | null,
  where: string,
  kind: string,
  errors: string[],
): string[] {
  const ids: string[] = [];
  for (const value of values) {
    const id = lookup(value);
    if (id === null) errors.push(`${where}: ${kind} «${value}» невідомо`);
    else if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function importSheets(sheets: Sheets, dictionaries: Dictionaries): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ---- groups ----
  const groupTable = readTable(SHEET.groups, sheets.groups, GROUP_COLUMNS, errors, warnings);
  const groups: IngredientGroup[] = [];
  for (const row of groupTable.rows) {
    const where = `${SHEET.groups}, рядок ${row.line}`;
    const id = row.get(GROUP_COLUMNS.id);
    if (id === '') {
      errors.push(`${where}: порожній id групи`);
      continue;
    }
    const status = statusOf(row.get(GROUP_COLUMNS.status), where, errors);
    const nameUk = textOrNull(row.get(GROUP_COLUMNS.nameUk));
    const source = row.get(GROUP_COLUMNS.source);
    const activeCell = row.get(GROUP_COLUMNS.active).toLowerCase();
    let active: boolean | undefined;
    if (YES.has(activeCell)) active = true;
    else if (NO.has(activeCell)) active = false;
    else if (activeCell !== '')
      errors.push(`${where}: «Активна група» може бути так, ні або порожньо`);
    if (status === 'verified' && (nameUk === null || source === '')) {
      errors.push(`${where}: позначено «перевірено», але порожня назва або джерело`);
    }
    groups.push({
      id,
      source: source === '' ? 'таблиця косметолога' : source,
      reviewStatus: status,
      nameUk,
      description: textOrNull(row.get(GROUP_COLUMNS.description)),
      patterns: splitList(row.get(GROUP_COLUMNS.patterns)),
      ...(active === undefined ? {} : { active }),
    });
  }
  const groupLookup = makeLookup(
    groups.map((group) => ({ id: group.id, labels: group.nameUk ? [group.nameUk] : [] })),
  );
  const groupStatus = new Map(groups.map((group) => [group.id, group.reviewStatus]));

  const conditionLookup = makeLookup(dictionaries.conditions);
  const goalLookup = makeLookup(dictionaries.goals);
  const reactionLookup = makeLookup(dictionaries.reactions);

  // ---- ingredients (two passes: names first, so "Відомі взаємодії" may point forward) ----
  const ingTable = readTable(
    SHEET.ingredients,
    sheets.ingredients,
    INGREDIENT_COLUMNS,
    errors,
    warnings,
  );
  const ingredientByName = new Map<string, string>();
  const ingredientIds: string[] = [];
  for (const row of ingTable.rows) {
    const inci = row.get(INGREDIENT_COLUMNS.inci);
    const id = row.get(INGREDIENT_COLUMNS.id) || (inci ? `ing-${slug(inci)}` : '');
    ingredientIds.push(id);
    for (const name of [id, inci, ...splitList(row.get(INGREDIENT_COLUMNS.aliases))]) {
      const key = normalizeName(name);
      if (key === '') continue;
      const owner = ingredientByName.get(key);
      if (owner !== undefined && owner !== id) {
        errors.push(
          `${SHEET.ingredients}, рядок ${row.line}: назву «${name}» вже має інший компонент (${owner})`,
        );
      } else {
        ingredientByName.set(key, id);
      }
    }
  }
  const ingredientLookup = (value: string) => ingredientByName.get(normalizeName(value)) ?? null;

  const ingredients: Ingredient[] = [];
  const seenIds = new Set<string>();
  ingTable.rows.forEach((row, index) => {
    const where = `${SHEET.ingredients}, рядок ${row.line}`;
    const inci = row.get(INGREDIENT_COLUMNS.inci);
    const id = ingredientIds[index] ?? '';
    if (inci === '') {
      errors.push(`${where}: порожній INCI`);
      return;
    }
    if (seenIds.has(id)) errors.push(`${where}: id «${id}» повторюється`);
    seenIds.add(id);

    const status = statusOf(row.get(INGREDIENT_COLUMNS.status), where, errors);
    const nameUk = textOrNull(row.get(INGREDIENT_COLUMNS.nameUk));
    const purpose = textOrNull(row.get(INGREDIENT_COLUMNS.purpose));
    const source = row.get(INGREDIENT_COLUMNS.source);
    if (status === 'verified') {
      if (nameUk === null)
        errors.push(`${where}: позначено «перевірено», але порожня «Назва українською»`);
      if (purpose === null) errors.push(`${where}: позначено «перевірено», але порожнє «Для чого»`);
      if (source === '') errors.push(`${where}: позначено «перевірено», але порожнє «Джерело»`);
    }

    const groupIds = resolveAll(
      splitList(row.get(INGREDIENT_COLUMNS.groups)),
      groupLookup,
      where,
      'групу',
      errors,
    );
    if (status === 'verified') {
      for (const group of groupIds) {
        if (groupStatus.get(group) !== 'verified') {
          warnings.push(
            `${where}: перевірений компонент у неперевіреній групі «${group}» (у публічному режимі група не показується)`,
          );
        }
      }
    }

    const cautions: Ingredient['cautions'] = [];
    for (const [textColumn, forColumn] of [
      [INGREDIENT_COLUMNS.caution1, INGREDIENT_COLUMNS.caution1For],
      [INGREDIENT_COLUMNS.caution2, INGREDIENT_COLUMNS.caution2For],
      [INGREDIENT_COLUMNS.caution3, INGREDIENT_COLUMNS.caution3For],
    ] as const) {
      const cautionText = row.get(textColumn);
      const forList = splitList(row.get(forColumn));
      if (cautionText === '' && forList.length > 0) {
        errors.push(`${where}: стани в «${forColumn}» вказано, а тексту застереження немає`);
        continue;
      }
      if (cautionText === '') continue;
      const conditions = resolveAll(forList, conditionLookup, where, 'стан шкіри', errors);
      cautions.push({
        conditions: conditions as Ingredient['cautions'][number]['conditions'],
        text: cautionText,
      });
    }

    const interactions = resolveAll(
      splitList(row.get(INGREDIENT_COLUMNS.interactions)),
      ingredientLookup,
      where,
      'компонент',
      errors,
    ).filter((other) => other !== id);

    ingredients.push({
      id,
      source: source === '' ? 'таблиця косметолога' : source,
      reviewStatus: status,
      inci,
      nameUk,
      aliases: splitList(row.get(INGREDIENT_COLUMNS.aliases)),
      groups: groupIds,
      category: textOrNull(row.get(INGREDIENT_COLUMNS.category)),
      purpose,
      properties: splitList(row.get(INGREDIENT_COLUMNS.properties)),
      cautions,
      usage: textOrNull(row.get(INGREDIENT_COLUMNS.usage)),
      knownInteractions: interactions,
      supports: resolveAll(
        splitList(row.get(INGREDIENT_COLUMNS.supports)),
        goalLookup,
        where,
        'ціль',
        errors,
      ),
    });
  });
  const ingredientStatus = new Map(ingredients.map((item) => [item.id, item.reviewStatus]));

  // ---- compatibility rules ----
  const ruleTable = readTable(SHEET.rules, sheets.rules, RULE_COLUMNS, errors, warnings);
  const compatRules: CompatibilityRule[] = [];
  const pairs = new Set<string>();
  const ruleIds = new Set<string>();

  // "група: …" / "компонент: …" may be written to be explicit. Without a prefix a group is found
  // by its Ukrainian name and a component by its INCI, synonym or id.
  const resolveRef = (value: string, where: string): CompatibilityRule['a'] | null => {
    const explicit = /^\s*(група|group|компонент|ingredient)\s*:\s*(.+)$/i.exec(value);
    const kind = explicit?.[1]?.toLowerCase();
    const name = explicit?.[2] ?? value;
    const group = kind === 'компонент' || kind === 'ingredient' ? null : groupLookup(name);
    const ingredient = kind === 'група' || kind === 'group' ? null : ingredientLookup(name);
    if (group !== null && ingredient !== null) {
      errors.push(
        `${where}: «${value}» може бути і групою, і компонентом; напиши «група: …» або «компонент: …»`,
      );
      return null;
    }
    if (group !== null) return { kind: 'group', id: group };
    if (ingredient !== null) return { kind: 'ingredient', id: ingredient };
    errors.push(`${where}: «${value}» не знайдено ні серед груп, ні серед компонентів`);
    return null;
  };

  for (const row of ruleTable.rows) {
    const where = `${SHEET.rules}, рядок ${row.line}`;
    const aCell = row.get(RULE_COLUMNS.a);
    const bCell = row.get(RULE_COLUMNS.b);
    if (aCell === '' || bCell === '') {
      errors.push(`${where}: потрібні обидва: «${RULE_COLUMNS.a}» і «${RULE_COLUMNS.b}»`);
      continue;
    }
    const a = resolveRef(aCell, where);
    const b = resolveRef(bCell, where);
    if (!a || !b) continue;
    if (a.kind === b.kind && a.id === b.id) {
      errors.push(`${where}: правило поєднує «${aCell}» саме з собою`);
      continue;
    }
    const pair = [`${a.kind}:${a.id}`, `${b.kind}:${b.id}`].sort().join(' + ');
    if (pairs.has(pair)) errors.push(`${where}: для пари ${pair} правило вже є`);
    pairs.add(pair);

    const id = row.get(RULE_COLUMNS.id) || `rule-${slug(a.id)}--${slug(b.id)}`;
    if (ruleIds.has(id)) errors.push(`${where}: id «${id}» повторюється`);
    ruleIds.add(id);

    const status = statusOf(row.get(RULE_COLUMNS.status), where, errors);
    const levelCell = row.get(RULE_COLUMNS.level).toLowerCase();
    const level = LEVEL_WORDS[levelCell];
    if (!level) errors.push(`${where}: «Рівень» має бути «обережно» або «інформація»`);

    const sameSlotCell = row.get(RULE_COLUMNS.sameSlotOnly).toLowerCase();
    // empty means "no": the rule then applies whenever both are in the routine (the cautious side)
    const sameSlotOnly = YES.has(sameSlotCell);
    if (sameSlotCell !== '' && !YES.has(sameSlotCell) && !NO.has(sameSlotCell)) {
      errors.push(`${where}: «${RULE_COLUMNS.sameSlotOnly}» може бути так, ні або порожньо`);
    }

    const priorityCell = row.get(RULE_COLUMNS.priority);
    const priority = priorityCell === '' ? 0 : Number(priorityCell);
    if (!Number.isInteger(priority)) errors.push(`${where}: «Пріоритет» має бути цілим числом`);

    const explanation = textOrNull(row.get(RULE_COLUMNS.explanation));
    const source = row.get(RULE_COLUMNS.source);
    if (status === 'verified') {
      if (explanation === null)
        errors.push(`${where}: позначено «перевірено», але порожнє «Пояснення»`);
      if (source === '') errors.push(`${where}: позначено «перевірено», але порожнє «Джерело»`);
      for (const ref of [a, b]) {
        const refStatus =
          ref.kind === 'group' ? groupStatus.get(ref.id) : ingredientStatus.get(ref.id);
        if (refStatus !== 'verified') {
          errors.push(
            `${where}: перевірене правило посилається на неперевірене «${ref.id}»: спершу перевір його`,
          );
        }
      }
    }

    const escalateConditions = resolveAll(
      splitList(row.get(RULE_COLUMNS.escalateConditions)),
      conditionLookup,
      where,
      'стан шкіри',
      errors,
    );
    const escalateReactions = resolveAll(
      splitList(row.get(RULE_COLUMNS.escalateReactions)),
      reactionLookup,
      where,
      'реакцію',
      errors,
    );

    compatRules.push({
      id,
      source: source === '' ? 'таблиця косметолога' : source,
      reviewStatus: status,
      a,
      b,
      level: level ?? 'caution',
      ...(escalateConditions.length > 0 || escalateReactions.length > 0
        ? {
            escalateWhen: {
              conditions: escalateConditions as NonNullable<
                CompatibilityRule['escalateWhen']
              >['conditions'],
              reactions: escalateReactions as NonNullable<
                CompatibilityRule['escalateWhen']
              >['reactions'],
            },
          }
        : {}),
      sameSlotOnly,
      explanation,
      timingAdvice: textOrNull(row.get(RULE_COLUMNS.timingAdvice)),
      priority: Number.isInteger(priority) ? priority : 0,
    });
  }

  return errors.length > 0
    ? { ok: false, errors, warnings }
    : { ok: true, ingredients, compatRules, groups, warnings };
}
