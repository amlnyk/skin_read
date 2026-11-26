# ARCHITECTURE.md: архітектура Skin Barrier

## 1. Принципи
1. Шари з однонаправленими залежностями. Бізнес-логіка нічого не знає про UI,
сховище і мережу.
2. Контент відокремлений від коду. Усі доменні тексти й правила лежать у
src/content/data/*.json і перевіряються zod та скриптом аудиту.
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

### Як працює перевірка меж (етап 1B)
- Інструмент: вбудоване правило ESLint `no-restricted-imports` із блоком правил на кожен шар (див. eslint.config.js). Окремий плагін не потрібен.
- Імпорти між шарами пишуться через аліас `@/` (це `src/`): `@/ui`, `@/features/scan`, `@/lib/ports`. Усередині одного модуля імпорти відносні (`./`, `../`).
- Заборонено: імпорт внутрішніх файлів чужого модуля (`@/features/scan/pages/ScanPage`), імпорт `../../...` (два і більше рівні вгору), порушення таблиці вище (наприклад, `@/store` у `logic`).
- logic додатково чиста: без `window`, `document`, `fetch`, `localStorage`, `Date.now()`, `new Date()` без аргументів, `Math.random()`, без react, zustand, idb-keyval.
- Обмеження способу: перевіряється текст шляху імпорту, а не те, куди він реально веде. Тому відносний шлях в один рівень (`../x`) не відрізнити від імпорту всередині модуля; шари це не стосується, бо між шарами правилами вимагається `@/`. Динамічні `import()` у цьому правилі не перевіряються (використовуються лише в app для lazy-маршрутів).
- Тест-доказ: `scripts/setup/setup-stage1b.ps1` створює файли з навмисними порушеннями й перевіряє, що lint їх відхиляє.

### Рядки інтерфейсу
- У JSX немає голого тексту: правило `react/jsx-no-literals`, плюс правила `no-restricted-syntax` на кириличні рядки в атрибутах і виразах JSX та на `aria-label`, `alt`, `title`, `placeholder` зі сталим рядком. Тести файлів `*.test.tsx` виключені.
- Ключі `t('...')` типізовані: неіснуючий ключ не компілюється.

### Порти, адаптери й сервіси
- Інтерфейси в `src/lib/ports.ts`; реалізації в `src/lib/*` (`storage/`, `clock.ts`, `ids.ts`, `logger.ts`).
- Адаптери збирає `src/app/compositionRoot.ts` (`createServices(env)`), а в дерево React їх подає `ServicesProvider`. Хуки фіч беруть їх через `useServices()` з `@/lib/services`. Контекст лежить у lib, а не в app, бо features не можуть імпортувати app.
- У тестах замість реальних адаптерів `createTestServices()` з `src/test/helpers/fakes.ts`.


## 3. Структура репозиторію

```text
skin-barrier/
  .github/            CI (workflows/ci.yml), dependabot.yml, шаблон PR
  .husky/             pre-commit
  api/
    analyze-label.ts  серверна функція (кожен файл тут, крім _*, стає функцією Vercel)
    _lib/             код функції: env, origin, rateLimit, imageGuard, visionProvider, errors, logger
      __tests__/      тести і testKit.ts
    __tests__/        тест точки входу
  content/
    cosmetologist/    таблиці косметолога (*.csv), з них npm run content:import пише src/content/data
    source/           оригінали матеріалів авторки, не редагувати
  docs/
    architecture/     ARCHITECTURE, STACK, API, decisions, states, pwa
    design/           DESIGN_SYSTEM (токени й компоненти з Figma, що перенести назад у Figma)
    quality/          accessibility, security-report, test-report, tz-compliance
    content/          content-guide (інструкція косметологу), content-inventory
    setup/            ci-setup, setup-security
  public/             іконки, favicon
  scripts/
    content/          audit.ts, import.ts (npm run content:audit / content:import)
    setup/            журнали етапів setup-*.ps1 (історія, повторно не запускаються)
  src/
    main.tsx, vite-env.d.ts
    app/              App, router, compositionRoot, app.config
      components/     ErrorBoundary, Layout, PersistenceGate, DataCorruptedScreen, UpdateBanner
      pages/          NotFoundPage
      guards/         OnboardingGuard
    features/<name>/  index.ts, README.md і лише папки:
      pages/ components/ hooks/ utils/ styles/ __tests__/
    logic/<module>/   index.ts, файли модуля, __tests__/; logic/config.ts (пороги)
    content/          index.ts і код шару (loader, bundled, policy, audit, files, version)
      data/           усі *.json контенту (форма { "items": [...] }) і version.json
      import/         імпорт таблиць косметолога
    schemas/  types/  store/ (migrations/)  lib/ (ai, idb, image, ...)  ui/<Компонент>/  i18n/  styles/
    styles/fonts/     файли шрифтів (Fixel Display *.woff2, Geologica *.ttf) і їхні ліцензії OFL.txt
    test/             setup.ts (vitest), helpers/ (TestProviders, appHarness, fakes),
                      data/ (персони й тестовий контент), __tests__/ (наскрізні тести)
  tests/fixtures/     JSON-фікстури (аліас @fixtures)
  CLAUDE.md, README.md, CHANGELOG.md, CONTENT_TODO.md, .env.example, vercel.json,
  vite.config.ts, tsconfig.json, eslint.config.js, package.json
```

### Правила розкладки файлів

Щоб файли різного призначення не лежали впереміш:

1. Тести лежать у папці `__tests__` поруч із кодом, який перевіряють
   (`logic/routine/__tests__/routine.test.ts`, `api/_lib/__tests__/handler.test.ts`).
   Поруч із кодом тестів немає.
   Тест стоїть на рівень глибше, тому до сусіднього модуля шару він іде як `../../profile`;
   лише в `__tests__` ESLint це дозволяє, у решті коду `../../` заборонено.
2. У корені фічі (`src/features/<name>/`) лише `index.ts` і `README.md`. Решта за типом:
   `pages/` (екрани маршрутів), `components/` (частини екранів), `hooks/` (use*),
   `utils/` (чисті допоміжні функції: describe, labels, format), `styles/` (*.module.css,
   спільні для кількох файлів фічі; стиль одного компонента лежить поруч із ним).
3. Дані контенту (JSON) лише в `src/content/data/`. Ззовні шару їх не імпортують напряму:
   усе береться з `@/content` (наприклад, `disclaimer`).
4. Код модуля `logic/<module>` лежить плоско, бо кожен файл це один крок логіки; підпапки
   лише для груп однотипних файлів (`analyze/steps/`, `profile/rules/`).
5. Документи лише в підпапках `docs/`, скрипти лише в підпапках `scripts/`.
6. Нова папка верхнього рівня або новий тип файлу: спершу запис сюди.

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
scripts/content/audit.ts перевіряє: схеми; унікальність id; унікальність
синонімів серед компонентів; посилальну цілісність (кожен id групи,
компонента, шаблону, на який є посилання, існує); кількість записів за
reviewStatus; з --strict падає за наявності не-verified. Версія контенту в
src/content/data/version.json (semver і дата), показується на екрані «Про
застосунок». Зміна контенту піднімає версію і записується в CHANGELOG.md.

## 8. Маршрути
/ (головна), /onboarding, /test, /result, /care, /care/analysis,
/care/collection, /care/collection/add, /care/needs, /scan, /scan/review,
/scan/result/:id, /compat, /profile,
/profile/journal, /profile/history, /profile/settings, /compare, /about,
/privacy, /dev/state (лише dev).
Guards: онбординг (якщо не завершено, редірект на /onboarding); профіль
потрібен для /care, /scan; блокування екрана emergency до підтвердження.
Важкі фічі (scan, journal, compare, compat) завантажуються lazy
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
- Доступність: WCAG 2.1 AA; основний текст від 16px (допоміжний 12–15px за дизайном, рішення 2026-11-26); зона натискання від 44px;
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
