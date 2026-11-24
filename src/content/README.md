# content

Доменний контент у JSON: компоненти, групи, правила сумісності, анкета, тексти безпеки, довідкові тексти, застереження. Кожен файл-контейнер має вигляд `{ "items": [ ... ] }`, кожен запис має `id`, `source`, `reviewStatus` (`verified` | `draft` | `placeholder`).

- відсутні від косметолога тексти це `null`, `reviewStatus: placeholder`, запис у CONTENT_TODO.md; нічого не вигадується;
- файли перевіряються схемами з `@/schemas` (див. `files.ts`) і завантажувачем `loader.ts`;
- `CONTENT_POLICY` застосовується лише в `policy.ts`: demo = verified + draft, public = verified;
- у застосунку контент завантажує `loadBundledContent` (`bundled.ts`, Vite), у скриптах `loadContent` (чистий, Node);
- `npm run content:audit` друкує кількість записів за статусами й оновлює розділ у CONTENT_TODO.md;
- `routine-steps.json` (етап 5): записи `base` пояснюють базові кроки догляду, записи `optional` це кандидати на необов'язковий крок; без перевірених кандидатів необов'язкових кроків немає;
- можна імпортувати: `@/schemas`, `@/types`; не можна: решту шарів;
- зовні імпортується через `@/content` (файл `index.ts`).
