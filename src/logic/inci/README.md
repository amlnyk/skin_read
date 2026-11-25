# logic/inci

Розбір тексту складу (INCI), зіставлення з довідником і пошук для довідника.

Пошук (етап 6):
- `normalizeText`: порівняння назв без регістру, діакритики й апострофів; розділові знаки й дефіси це пробіли (`й` = `и`, `ї` = `і` навмисно);
- `searchIngredients(query, content, { category })`: пошук за назвою, INCI і синонімами; порожній запит повертає все;
- `searchGroups`, `ingredientsOfGroup`, `ungroupedIngredients`, `categoriesOf`: допоміжні вибірки для екрана довідника.

Розбір складу (етап 7):
- `parseInci(text)` → `{ items, warnings }`: префікси, роздільники, дужки, виноски, концентрація «як написано»; попередження `multiple_lists_detected` і `too_long`;
- `normalizeIngredients(items, content)` → `{ matched, unknown }`: рівні `exact`, `alias`, `group_pattern`, `fuzzy` (нечіткий збіг завжди `needsConfirmation`);
- `coverage(matched, unknown)` → `{ total, recognized, unknownRatio, isSufficient }`;
- `levenshtein(a, b, limit?)`: відстань редагування без залежностей;
- пороги в `../config.ts`.

Правила: чисті функції.
- можна імпортувати: `@/schemas`, `@/types`, `@/lib/result`;
- не можна: react, DOM, store, features, ui, інші модулі lib, fetch;
- не можна `Date.now()`, `new Date()` без аргументів, `Math.random()`: час і id приходять аргументами;
- контент приходить аргументом, а не імпортом;
- назв компонентів у коді немає: усе знання лежить у JSON-контенті.
