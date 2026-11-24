# ARCHITECTURE.md: архітектура Skin Barrier

## 1. Принципи
1. Шари з однонаправленими залежностями. Бізнес-логіка нічого не знає про UI,
сховище і мережу.
2. Контент відокремлений від коду. Усі доменні тексти й правила лежать у
src/content/*.json і перевіряються zod та скриптом аудиту.
3. Єдине джерело істини: zod-схеми в src/schemas. Типи виводяться з них
(z.infer), дублювати типи вручну заборонено.
4. Порти й адаптери. Усе, що виходить за межі чистої логіки (сховище, час,
випадковість, мережа, ШІ, логування), закрите інтерфейсом у src/lib/ports.ts.
Реалізації підставляються в composition root, а в тестах замінюються фейками.

5. Вертикальні зрізи. Кожна фіча живе в src/features/<name> разом зі
сторінками, компонентами й хуками.
6. Недовіреним даним не місце в логіці чи DOM без перевірки (localStorage,
імпорт, API, ШІ, введення користувача).
7. Детермінованість. Однакові входи дають однаковий результат; час і id
передаються ззовні.
8. Плавна деградація. Без ШІ, мережі чи камери застосунок працює.

## 2. Шари й правила залежностей

```text
   app (composition root, router, providers)
       -> features/<name> (pages, components, hooks = use-cases)
            -> logic | store | content | lib | ui | i18n
                          -> schemas / types (zod)
   api/ (сервер) -> api/_lib -> src/schemas/api.ts
```

| Шар | Що містить | Може імпортувати | Не може імпортувати |
|---|---|---|---|
| schemas, types | zod-схеми, enums, API-контракти, виведені типи | лише zod | будь-що інше з проєкту |
| logic | чисті функції домену (safety, test, profile, routine, inci, compat, analyze, journal, compare) | schemas, types, lib/result | react, DOM, store, features, ui, lib/storage, fetch, Date.now, Math.random; контент приходить аргументом |
| content | JSON, loader, ContentProvider, перевірка zod | schemas | features, ui, store |
| lib | адаптери й утиліти без UI (ports, storage, idb, image, ai, clock, ids, logger, env, result, exportImport) | schemas, types | features, ui, store, logic |
| store | Zustand-сховища (slices), persist, міграції | schemas, types, lib/ports | features, ui, logic |
| ui | презентаційні компоненти дизайн-системи | react, i18n, styles | store, logic, features, content |
| features | сторінки, компоненти, хуки конкретної фічі | logic (через index.ts), store, content, lib, ui, i18n, schemas | інші features; внутрішні файли чужих модулів |
| app | роутер, провайдери, composition root, guards, ErrorBoundary | усі шари | нічого, окрім бізнес-логіки в собі: тут її немає |
| api (сервер) | serverless-функції та api/_lib | src/schemas/api.ts, api/_lib | src/features, src/ui, src/store |

Межі перевіряються ESLint і CI. Є тест-доказ: навмисне порушення (наприклад,
імпорт store у logic) валить lint.

## 3. Структура репозиторію

```text
skin-barrier/
  .github/ (workflows/ci.yml, dependabot.yml, pull_request_template.md)
  .husky/ (pre-commit)
  api/
    analyze-label.ts, simplify.ts (необов'язково)
    _lib/ (env.ts, origin.ts, rateLimit.ts, imageGuard.ts, visionProvider.ts, errors.ts, logger.ts)
  content/source/ (оригінали матеріалів авторки, не редагувати)
  docs/ (STACK.md, ARCHITECTURE.md, API.md, decisions.md, content-inventory.md, test-report.md, security-report.md)
  public/ (favicon, manifest, іконки)
  scripts/ (content-audit.ts)
  src/
    app/ (main.tsx, App.tsx, router.tsx, providers.tsx, compositionRoot.ts, app.config.ts, guards/, ErrorBoundary.tsx, Layout.tsx)
    features/<name>/ (index.ts, routes.tsx, pages/, components/, hooks/, *.module.css, *.test.tsx)
      onboarding, test, profile, routine, products, scan, reference, compat, journal, settings, compare, about, dev
    logic/<module>/ (index.ts, файли, *.test.ts); logic/config.ts (пороги)
      safety, test, profile, routine, inci, compat, analyze, journal, compare
    content/ (loader.ts, provider.ts, version.json, *.json)
    schemas/ (enums.ts, profile.ts, test.ts, product.ts, routine.ts, scan.ts, journal.ts, content.ts, api.ts, index.ts)
    types/ (index.ts: реекспорт виведених типів)
    store/ (index.ts, createPersistedStore.ts, migrations/, slices/)
    lib/ (ports.ts, result.ts, env.ts, clock.ts, ids.ts, logger.ts, storage/, idb/, image/, ai/, exportImport/)
    ui/ (Button, Card, Chip, ProgressBar, InfoBanner, Tabs, Modal, Field, StatusBadge, index.ts)
    i18n/ (uk.ts, t.ts)
    styles/ (tokens.css, reset.css, global.css)
  tests/ (fixtures/, e2e/)
  CLAUDE.md, README.md, CHANGELOG.md, CONTENT_TODO.md, .env.example, vercel.json, vite.config.ts, tsconfig.json, eslint.config.js, package.json, package-lock.json
```

Кожна папка в src/features і src/logic має index.ts як публічний API. Ззовні
імпортується лише він.

## 4. Use-cases і оркестрація

Фіча-хук (наприклад, useProfileBuilder) читає зі store, викликає чисті
функції logic, пише результат у store. Logic ніколи не викликає store, store
ніколи не викликає logic. Так логіка тестується без React, а store без
логіки.

## 5. Потоки даних
1. Тест до профілю. TestPage пише відповіді в testDraft (store) -> по
завершенні хук викликає logic/test.validateAnswers і
logic/profile.buildProfile(answers, content) -> ResultPage показує результат
-> користувач підтверджує -> store.profile.commit (revision +1) ->
logic/routine.buildBaseRoutine -> store.routine.
2. Перевірка засобу за текстом. PasteInciPage -> logic/inci.parseInci ->
logic/inci.normalizeIngredients(items, content) -> ReviewParsedPage
(користувач виправляє нечіткі збіги) -> logic/analyze.analyzeProduct(product,
profile, analysis, routine, content, clock.now()) -> store.scans.add ->
ScanResultPage.
3. Перевірка за фото. PhotoCapture -> перевірка згоди
(store.settings.consents) -> lib/image.resizeImage -> LabelReader.analyze
(HttpLabelReader) -> api/analyze-label (Origin -> ліміти -> валідація ->
VisionProvider -> zod) -> ingredientsText -> далі як потік 2, з кроку
ReviewParsedPage.
4. Щоденник до пропозиції оновити профіль. JournalPage -> store.journal ->
logic/journal.suggestProfileUpdate -> банер -> підтвердження користувача ->
повторне проходження питання про стани -> потік 1.

## 6. Стан і збереження
- Сховища (slices): onboarding, testDraft, profile, routine, routineLog,
products, scans, journal, needs, settings. Окремий непостійний uiStore для
тимчасового стану інтерфейсу.
- Persist: один ключ skinbarrier:v1 через StorageAdapter, version, migrate,
partialize. При відновленні дані проходять zod; якщо ні, екран «Дані
пошкоджені» з копією сирих даних і скиданням.
- Міграції: кожна зміна форми даних піднімає version і має функцію migrate vN
-> vN+1 та тест на фікстурі старих даних.
- Фото лише в IndexedDB за ключами photo:<productId>. Видаляються разом із
засобом.
- Експорт/імпорт: { app: 'skin-barrier', schemaVersion, exportedAt, data },
імпорт перевіряється zod і не змінює consents без явного підтвердження.
- На сервер дані користувача не потрапляють, крім фото етикетки за окремою
згодою.

## 7. Конвеєр контенту
content/source (оригінали) -> структурований JSON у src/content (кожен запис

має id, source, reviewStatus) -> zod-перевірка -> loader (єдине місце, де
застосовується CONTENT_POLICY: demo = verified + draft, public = лише
verified) -> ContentProvider -> аргумент функцій logic.
scripts/content-audit.ts перевіряє: схеми; унікальність id; унікальність
синонімів серед компонентів; посилальну цілісність (кожен id групи,
компонента, шаблону, на який є посилання, існує); кількість записів за
reviewStatus; з --strict падає за наявності не-verified. Версія контенту в
src/content/version.json (semver і дата), показується на екрані «Про
застосунок». Зміна контенту піднімає версію і записується в CHANGELOG.md.

## 8. Маршрути
/ (головна), /onboarding, /test, /result, /care, /care/analysis,
/care/collection, /care/collection/add, /care/needs, /scan, /scan/review,
/scan/result/:id, /reference, /reference/:id, /reference/compat, /profile,
/profile/journal, /profile/history, /profile/settings, /compare, /about,
/privacy, /dev/state (лише dev).
Guards: онбординг (якщо не завершено, редірект на /onboarding); профіль
потрібен для /care, /scan; блокування екрана emergency до підтвердження.
Важкі фічі (scan, journal, compare, reference) завантажуються lazy
(React.lazy, окремі чанки).

## 9. Помилки, логи, конфіг
- Очікувані збої (валідація, мережа, ШІ) це Result<T, E> з типізованим кодом,
а не винятки. Винятки лише для помилок програміста. ErrorBoundary на кожному
маршруті. Коди помилок перетворюються на тексти через i18n.
- Logger через порт: у dev console, у проді лише warn і error, без
персональних даних. Сервер логує лише коди й факт спрацювання лімітів.
- Конфіг: src/lib/env.ts (zod-перевірка VITE_ змінних при старті); прапорці
фіч (photoScan, simplifyAI) в app.config.ts з env.
- Рядки інтерфейсу лише через t() із src/i18n/uk.ts. Голих українських рядків
у JSX немає.

## 10. Тестування
| Рівень | Що | Інструмент | Ціль |
|---|---|---|---|
| Unit | усі чисті функції logic, lib, схеми | Vitest | покриття рядків logic не нижче 90%, загалом не нижче 70% |
| Контент | схеми, унікальність, посилальна цілісність, reviewStatus | content-audit у CI | 0 помилок |
| Компоненти | ключові екрани й умовна видимість полів | Testing Library | тест, анкета, результат, сканер, щоденник |
| Контракт | api/*: валідація, коди помилок, ліміти, Origin (без реального ШІ) | Vitest | усі коди з API.md покриті |

| Міграції | vN -> vN+1 на фікстурах | Vitest | кожна міграція |
| Персони й фікстури | T1-T8, F1-F7 з плану | Vitest | усі очікування збігаються |
| e2e (необов'язково) | три смоуки: онбординг -> результат; вставити склад -> вердикт; офлайн | Playwright | зелені на Preview |

## 11. Середовища, CI/CD, релізи
| Середовище | Звідки | Змінні | Контент | Призначення |
|---|---|---|---|---|
| Local | npm run dev | .env.local | demo | розробка |
| Preview | кожен pull request у Vercel | Vercel Preview | demo | перевірка на телефоні, камера (HTTPS) |
| Production | гілка main у Vercel | Vercel Production | demo для захисту, public для публічного запуску | реліз |

CI (.github/workflows/ci.yml, на push і pull_request): checkout, setup-node
(LTS, кеш npm), npm ci, npm run check (typecheck, lint, test:coverage,
content:audit, build), npm audit --audit-level=high, gitleaks. Без зеленого
CI злиття заборонене (захист гілки main, якщо дозволяє план GitHub).
Гілки: main захищена; робота в коротких гілках stage-N-назва; злиття через
pull request зі squash. Повідомлення комітів за Conventional Commits (feat,
fix, chore, docs, test, refactor). Версії за semver, теги vX.Y.Z,
CHANGELOG.md за Keep a Changelog.
Релізи: PR -> зелений CI і перевірка Preview на телефоні -> merge у main ->
автодеплой Production -> тег -> нотатки релізу. Відкат: Vercel rollback до
попереднього деплою або git revert. Дані користувачів на сервері відсутні,
тому міграцій на сервері немає.

## 12. Нефункціональні вимоги
- Продуктивність (цілі): початковий JS головного маршруту не більше 200 КБ
gzip; Lighthouse Performance на мобільному не нижче 90; шрифти власні (woff2,
font-display swap); важкі фічі lazy.
- Доступність: WCAG 2.1 AA; шрифт від 16px; зона натискання від 44px;
контраст 4.5:1; клавіатура; aria-label; prefers-reduced-motion.
- Браузери: iOS Safari 16+, Android Chrome і настільні Chrome, Firefox, Edge
(останні дві версії).
- Приватність: без акаунта, дані локально, фото лише за згодою, без трекерів.
- Офлайн: усе, окрім фото-розпізнавання, працює без мережі.

## 13. Шлях масштабування (чим замінюється, а не переписується)
| Потреба | Зараз | Потім | Що змінюється |
|---|---|---|---|
| Акаунти і синхронізація | localStorage | Supabase (Auth + Postgres, row-level security) | реалізація StorageAdapter і сервіс синхронізації; logic і schemas без змін |
| Великий каталог засобів, контент у CMS | JSON у репозиторії | БД або headless CMS | реалізація ContentProvider |
| Надійні ліміти | in-memory | Upstash Redis | rateLimit.ts |
| Інший OCR чи модель | Claude vision | будь-який провайдер | реалізація VisionProvider (сервер) і LabelReader (клієнт) |
| Інші мови | uk | en, pl тощо | нові словники i18n і контент за локаллю |
| Нативний застосунок | вебзастосунок | Expo (React Native) | logic, schemas, content виносяться в packages/core (npm workspaces), бо вони без React |
| Автоматичні альтернативи, ціни | відсутні | каталог і ціни з джерел | нові модулі logic і content, без зміни наявних |

## 14. Definition of Done для кожного етапу
1. Реалізовано рівно те, що в завданні етапу.
2. Типи виводяться зі схем, помилок typecheck немає.
3. Є тести (unit, де треба компонентні й контрактні), npm run check зелений.
4. Межі шарів дотримані, lint без попереджень.
5. Усі рядки UI через t(), стилі лише через токени.
6. Є стани завантаження, порожньо, помилка там, де це доречно; доступність
перевірена.
7. Немає секретів, залежності пояснені, npm audit без high.
8. Документація оновлена (README, docs, decisions.md, CHANGELOG.md,
CONTENT_TODO.md).
9. Звіт за шаблоном, коміт за Conventional Commits, тег stage-N.

## 15. Конвенції коду
Компоненти й файли компонентів: PascalCase. Хуки: useXyz. Решта файлів:
camelCase. Тести поруч: *.test.ts(x). Іменовані експорти; для React.lazy
використовуй .then(m => ({ default: m.Page })). Константи UPPER_SNAKE,
налаштовувані пороги лише в logic/config.ts. Enum як рядкові union із zod.
Файл до ~250 рядків, функція до ~40. Коментарі англійською і пояснюють
«чому», а не «що». Жодного any, жодного @ts-ignore без причини в коментарі.
Імпорти через аліас @/ (src), відносні лише всередині модуля.
