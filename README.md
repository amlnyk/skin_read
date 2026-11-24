# Skin Barrier

Некомерційний освітній mobile-first вебзастосунок, який допомагає навчитися самостійно обирати догляд за шкірою та читати склад косметики.

## Запуск

Потрібні Node.js і npm. Команди виконуються в теці проєкту.

```
npm install        # один раз, встановлює залежності
npm run dev        # запускає локально, адреса з'явиться в терміналі
npm run dev -- --host   # те саме, але відкривається і з телефону в тій самій Wi-Fi
npm run check      # typecheck + lint + формат + тести з покриттям + аудит контенту + збірка
```

Інші команди: `npm run build`, `npm run preview`, `npm run typecheck`, `npm run lint`, `npm run format` (автоформат), `npm run test`, `npm run test:coverage`, `npm run content:audit`.

Коміти робляться з Windows PowerShell: перед комітом husky запускає eslint, prettier і gitleaks.

## Документація

- `CLAUDE.md`: постійні інструкції проєкту.
- `docs/STACK.md`, `docs/ARCHITECTURE.md`, `docs/API.md`: технології, архітектура, контракти.
- `docs/decisions.md`: журнал рішень.
- `docs/content-inventory.md`, `CONTENT_TODO.md`: який контент є, а якого бракує.
- `docs/ci-setup.md`: CI і налаштування GitHub, які робить лише власниця репозиторію.
- `CHANGELOG.md`: що змінювалося.
