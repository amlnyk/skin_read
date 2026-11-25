# content

Доменний контент у JSON: компоненти, групи, правила сумісності, анкета, тексти безпеки, довідкові тексти, застереження. Кожен файл-контейнер має вигляд `{ "items": [ ... ] }`, кожен запис має `id`, `source`, `reviewStatus` (`verified` | `draft` | `placeholder`).

- відсутні від косметолога тексти це `null`, `reviewStatus: placeholder`, запис у CONTENT_TODO.md; нічого не вигадується;
- файли перевіряються схемами з `@/schemas` (див. `files.ts`) і завантажувачем `loader.ts`;
- `CONTENT_POLICY` застосовується лише в `policy.ts`: demo = verified + draft, public = verified;
- у застосунку контент завантажує `loadBundledContent` (`bundled.ts`, Vite), у скриптах `loadContent` (чистий, Node);
- `npm run content:audit` друкує кількість записів за статусами й оновлює розділ у CONTENT_TODO.md;
- `routine-steps.json` (етап 5): записи `base` пояснюють базові кроки догляду, записи `optional` це кандидати на необов'язковий крок; без перевірених кандидатів необов'язкових кроків немає;
- `ingredient-groups.json` (етап 6): групи з ТЗ зі статусом `draft` і назвою без опису; `patterns` це лексичні шаблони розпізнавання (`*x` = закінчується на x), поки вони з плану, а не з матеріалів косметолога; `ingredients.json`: окремих компонентів без матеріалів косметолога немає, нічого не вигадується;
- `observation-templates.json` (етап 9): тексти спостережень про всю рутину (`text`: що знайдено, `why`: чому), по запису на кожен id з `OBSERVATION_TEMPLATE_IDS`; без тексту `placeholder`, на екрані «Інформація готується»;
- можна імпортувати: `@/schemas`, `@/types`; не можна: решту шарів;
- зовні імпортується через `@/content` (файл `index.ts`).
- `version.json` (етап 13): `appVersion` (дорівнює `version` у `package.json`), `contentVersion` і `updatedAt`; не контент і не входить до аудиту. `contentVersion` піднімається при кожній зміні контенту; читається через `@/content` (`APP_VERSION`, `CONTENT_VERSION`, `CONTENT_UPDATED_AT`).
