// Column titles of the three tables. They are what the cosmetologist sees, so they are Ukrainian.
// Changing a title here means changing the header of the CSV file too (a test checks both).

export const INGREDIENT_COLUMNS = {
  id: 'id',
  inci: 'INCI',
  nameUk: 'Назва українською',
  aliases: 'Синоніми',
  groups: 'Групи',
  category: 'Категорія',
  purpose: 'Для чого',
  properties: 'Властивості',
  caution1: 'Застереження 1',
  caution1For: 'Застереження 1: для станів',
  caution2: 'Застереження 2',
  caution2For: 'Застереження 2: для станів',
  caution3: 'Застереження 3',
  caution3For: 'Застереження 3: для станів',
  usage: 'Як застосовувати',
  interactions: 'Відомі взаємодії',
  supports: 'Підтримує цілі',
  source: 'Джерело',
  status: 'Статус',
  note: 'Примітка',
} as const;

export const RULE_COLUMNS = {
  id: 'id',
  a: 'Компонент або група А',
  b: 'Компонент або група Б',
  level: 'Рівень',
  sameSlotOnly: 'Лише в один час догляду',
  escalateConditions: 'Посилити для станів',
  escalateReactions: 'Посилити при реакціях',
  explanation: 'Пояснення',
  timingAdvice: 'Порада щодо часу',
  priority: 'Пріоритет',
  source: 'Джерело',
  status: 'Статус',
  note: 'Примітка',
} as const;

export const GROUP_COLUMNS = {
  id: 'id',
  nameUk: 'Назва українською',
  description: 'Опис',
  patterns: 'Шаблони назв',
  active: 'Активна група',
  source: 'Джерело',
  status: 'Статус',
  note: 'Примітка',
} as const;

/** Columns that may stay out of a table (everything else must be in the header). */
export const OPTIONAL_COLUMNS: ReadonlySet<string> = new Set(['id', 'Примітка']);
