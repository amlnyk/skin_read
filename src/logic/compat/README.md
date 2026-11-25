# logic/compat

Перевірка сумісності компонентів.

- `checkPair(a, b, ctx, content)` → `CompatResult` (`status`, `reason`, `ruleId`, `explanation`, `timingAdvice`, `conditionNotes`, `source`, `reviewStatus`);
- `checkList(subjects, ctx, content)`: усі пари, спершу найважливіші (`not_recommended_for_profile`, `caution`, `insufficient_info`, `no_known_conflicts`);
- `matchRule(a, b, content, ctx)`: яке правило діє для пари.

Складова (`CompatSubject`) це компонент або група, за потреби зі своїми слотами. `ctx` це `{ slot?, profile? }`.
Правила лише в `src/content/data/compat-rules.json`, у коді їх немає. Логіка повертає коди причин, а тексти підставляє екран.
Пара без правила дає `no_known_conflicts`: це «у межах наявних даних», а не гарантія.

Правила: чисті функції.
- можна імпортувати: `@/schemas`, `@/types`, `@/lib/result`;
- не можна: react, DOM, store, features, ui, інші модулі lib, fetch;
- не можна `Date.now()`, `new Date()` без аргументів, `Math.random()`: час і id приходять аргументами;
- контент приходить аргументом, а не імпортом.
