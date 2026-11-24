# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/uk/1.1.0/). Версії: [SemVer](https://semver.org/lang/uk/). Повідомлення комітів: [Conventional Commits](https://www.conventionalcommits.org/uk/).

## [Unreleased]

### Added
- Етап 0: документація проєкту (CLAUDE.md, STACK, ARCHITECTURE, API), журнал рішень, інвентар контенту.
- Етап 1: каркас застосунку (Vite, React, TypeScript, роутер із 5 вкладками, ErrorBoundary, токени стилів, медичне застереження), перевірки `npm run check`.
- Етап 1B: фундамент для продакшену: шари з перевіркою меж в ESLint, словник інтерфейсу `t()`, порти й адаптери, Result, перевірка env, composition root, lazy-маршрути, guard онбордингу (заглушка), покриття тестами з порогами, husky і lint-staged, CI у GitHub Actions.
- Етап 2: zod-схеми й типи, збережене Zustand-сховище з перевіркою даних і екраном «Дані пошкоджені», контейнери контенту із заглушками й завантажувач за CONTENT_POLICY, `npm run content:audit` (tsx) з оновленням CONTENT_TODO.md, сторінка `/dev/state` лише в dev.
- Етап 3: онбординг із трьох кроків, повний інтерфейс опитувальника на даних (`questionnaire.json` за ТЗ, умови показу в JSON, exclusive-варіанти, поле «Інше», автозбереження й відновлення з того самого питання), м'яке вікно суперечності в питанні 2, `logic/test`, UI-компоненти Button, Chip, Field, Modal, ProgressBar, заглушка результату.
