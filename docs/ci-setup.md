# CI і захист гілки main

## Що вже налаштовано в репозиторії

- `.github/workflows/ci.yml` запускається на кожен push у `main` і на кожен pull request: `npm ci`, `npm run check`, `npm audit --audit-level=high`, gitleaks.
- `.github/dependabot.yml`: щотижня PR з оновленнями npm і GitHub Actions.
- `.github/pull_request_template.md`: чекліст у кожному PR.
- Локально: husky + lint-staged на коміті (eslint, prettier, gitleaks).

## Що може зробити лише власниця репозиторію (на сайті GitHub)

Це не робиться кодом. Репозиторій: Settings.

1. **Code security** (Settings, Code security): увімкнути Dependabot alerts, Dependabot security updates, Secret scanning, Push protection.
2. **Захист гілки main** (Settings, Branches, Add branch ruleset або Add classic branch protection rule для `main`):
   - Require a pull request before merging;
   - Require status checks to pass before merging, додати перевірку **check** (зʼявиться в списку лише після першого запуску CI);
   - Block force pushes.
3. Після цього робота йде так: коротка гілка `stage-N-назва`, push, pull request, зелений CI, злиття (squash).

Якщо опцій немає (залежить від плану GitHub для приватних репозиторіїв), у публічному репозиторії вони доступні безкоштовно. Поточний репозиторій публічний.

## Як прочитати червоний CI

Відкрий вкладку Actions, обери запуск, відкрий крок, що позначений червоним, скопіюй текст помилки й надішли його Claude. Той самий набір перевірок запускається локально командою `npm run check`.

## Vercel

Не підключений (рішення авторки, див. docs/decisions.md). Частини плану про Preview-деплой і змінні середовища Vercel відкладені.
