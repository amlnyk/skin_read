# features/about

Про застосунок, версія контенту, приватність, медичне застереження.

- `pages/AboutPage`: що це, для кого, незалежність, джерела даних і стан перевірки (рахує `summarizeContent` за вмістом, який пропустила політика), версії, обмеження;
- `pages/PrivacyPage`: які дані, де, що йде на сервер і коли;
- `pages/DisclaimerPage`: текст із `content/disclaimer.json`;
- маршрути `/profile/about`, `/profile/privacy`, `/profile/disclaimer`, посилання в `Профілі`;
- усі тексти в `uk.ts` (`about.*`, `privacy.*`, `disclaimerPage.*`); це чернетки, що чекають перевірки (`CONTENT_TODO.md`, етап 13).

Правила імпорту:
- ззовні цю фічу імпортують лише через `@/features/about` (файл `index.ts`);
- усередині фічі імпорти відносні (`./`, `../`);
- можна імпортувати: `@/logic/*`, `@/store`, `@/content`, `@/lib/*`, `@/ui`, `@/i18n`, `@/schemas`, `@/types`;
- не можна: інші фічі, `@/app`.
