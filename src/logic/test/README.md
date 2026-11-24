# logic/test

Чисті функції опитувальника: які питання показати (`getVisibleQuestions`), як застосувати вибір варіанта з exclusive-логікою (`applySelection`), прибрати відповіді на приховані питання (`pruneHiddenAnswers`), перевірити відповіді (`validateAnswers`) і знайти суперечності (`findContradictions`).

Правила: чисті функції.
- питання приходять аргументом (з `content/questionnaire.json`), умови показу (`showIf`) живуть у JSON, не в коді;
- можна імпортувати: `@/schemas`, `@/types`, `@/lib/result`;
- не можна: react, DOM, store, features, ui, інші модулі lib, fetch;
- не можна `Date.now()`, `new Date()` без аргументів, `Math.random()`: час і id приходять аргументами.
