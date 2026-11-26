# Skin Barrier

Некомерційний освітній mobile-first вебзастосунок, який допомагає навчитися самостійно обирати догляд за шкірою та читати склад косметики. Версія `1.0.0`.

## Для кого

Для людей, які хочуть краще розуміти власний догляд за шкірою. Застосунок не ставить діагнозів, не замінює лікаря, не прив'язаний до жодного бренду й нічого не продає.

## Що вміє

- тест → профіль шкіри → базова схема догляду на ранок і вечір, список потреб;
- довідник компонентів (INCI), перевірка сумісності двох компонентів;
- перевірка складу засобу під свій профіль і свою рутину (вставкою тексту або з фото етикетки);
- колекція засобів, історія перевірок, порівняння двох засобів;
- аналіз усієї рутини;
- щоденник шкіри з календарем і графіком за 30 днів;
- нагадування (лише інтерфейс), експорт і імпорт даних, видалення даних;
- працює без інтернету (крім розпізнавання фото) і встановлюється на головний екран.

## Стек

React 19, TypeScript, Vite, React Router, Zustand (сховище в `localStorage`), zod, `idb-keyval` (фото на пристрої), `vite-plugin-pwa` (manifest і service worker), Vitest і Testing Library. Серверна частина: одна функція `api/analyze-label.ts` (Vercel Functions, звичайний `fetch` до API ШІ). Деталі: `docs/architecture/STACK.md`.

## Структура

```
src/
  app/        застосунок: навігація, маршрути, ErrorBoundary, банер оновлення
  features/   екрани (about, care, home, journal, onboarding, products, profile, scan, settings, test ...)
  logic/      чиста логіка без React: профіль, рутина, аналіз, сумісність, щоденник
  content/    завантажувач контенту; самі JSON (довідка, анкета, правила, version.json) у content/data/
  schemas/    zod-схеми й типи
  store/      Zustand-сховище з версіями формату
  lib/        порти й адаптери: сховище, час, фото, клієнт ШІ, PWA
  ui/         спільні компоненти
  styles/     tokens.css (єдине місце з кольорами й розмірами)
  i18n/       усі тексти інтерфейсу (uk.ts)
  test/       налаштування тестів і спільні помічники
api/          серверні функції
content/      таблиці косметолога (cosmetologist/) і оригінали матеріалів (source/)
docs/         документація за темами: architecture/, quality/, content/, setup/
scripts/      content/ (імпорт і аудит контенту), setup/ (журнали етапів)
tests/        JSON-фікстури для тестів
```

Правила шарів, що саме кому можна імпортувати: `docs/architecture/ARCHITECTURE.md` (перевіряє ESLint). Там же, у розділі 3, правила розкладки файлів: тести в `__tests__` поруч із кодом, у корені фічі лише `index.ts` і `README.md`.

## Запуск

Потрібні Node.js 22+ і npm. Команди виконуються в теці проєкту.

```
npm install        # один раз, встановлює залежності
npm run dev        # запускає локально, адреса з'явиться в терміналі
npm run dev -- --host   # те саме, але відкривається і з телефону в тій самій Wi-Fi
npm run check      # typecheck + lint + формат + тести з покриттям + аудит контенту + збірка
npm run build && npm run preview   # продакшен-збірка зі service worker
```

Інші команди: `npm run content:import`, `npm run typecheck`, `npm run lint`, `npm run format` (автоформат), `npm run test`, `npm run test:coverage`, `npm run content:audit`.

Service worker є лише в продакшен-збірці. Щоб перевірити встановлення й роботу без інтернету, див. `docs/architecture/pwa.md`.

Коміти робляться з Windows PowerShell: перед комітом husky запускає eslint, prettier і gitleaks.

## Змінні середовища

Лише імена, без значень: `.env.example`. Копія для локальної роботи `.env.local` ігнорується git.

- `VITE_*`: публічні, потрапляють у клієнтський код, секретів у них немає й бути не може;
- решта (`ANTHROPIC_API_KEY`, ліміти, `ALLOWED_ORIGINS`...): лише в налаштуваннях хоста, окремо для Production, Preview, Development. Опис кожної: `docs/architecture/API.md`.

Без `ANTHROPIC_API_KEY` функція розпізнавання відповідає 503, а застосунок пропонує ввести склад вручну; решта працює.

## Як додати контент і що означають статуси

Компоненти, правила сумісності й групи заповнюються в таблицях `content/cosmetologist/*.csv` (Excel або Google Sheets) і переносяться командою `npm run content:import`: інструкція для косметолога в `docs/content/content-guide.md`. Решта контенту лежить у `src/content/data/*.json` (кожен файл `{ "items": [...] }`). Кожен запис має `id`, `source` (звідки взято) і `reviewStatus`:

- `verified`: текст перевірила фахівчиня;
- `draft`: чернетка, чекає перевірки;
- `placeholder`: тексту ще немає (`null`), на екрані «Інформація готується».

Нічого не вигадується: якщо тексту немає в матеріалах, він `null`, статус `placeholder`, а запис потрапляє в `CONTENT_TODO.md`.

Режим показу задає `VITE_CONTENT_POLICY`: `demo` показує `verified` і `draft`, `public` лише `verified` (тоді порожні екрани це правильна поведінка, поки не затверджено тексти). Після зміни будь-якого файлу контенту:

1. запусти `npm run content:audit` (перевіряє схеми, посилання між файлами, дублікати; оновлює `CONTENT_TODO.md`);
2. підніми `contentVersion` у `src/content/data/version.json`.

Після повного затвердження контенту: `npm run content:audit -- --strict` має пройти.

## Обмеження

- Це не медична порада і не діагноз.
- Розпізнавання складу з фото може помилятися: склад завжди показується для перевірки й виправлення.
- Концентрації інгредієнтів, формула засобу й pH невідомі, тому висновки про склад орієнтовні.
- Дані лише з наданих матеріалів проєкту. Більша частина довідкових текстів поки чернетки або заготовки: стан видно на екрані «Про застосунок і джерела даних» і в `CONTENT_TODO.md`.
- Дані зберігаються лише в браузері на пристрої; очищення даних сайту їх видалить.

## Розгортання

Проєкт розрахований на Vercel (статичний фронтенд + функція `api/`), але нічого не прив'язано до нього жорстко. Кроки (виконує власниця акаунта, ключі в репозиторій не потрапляють):

1. Імпортувати репозиторій у Vercel; Build Command `npm run build`, Output `dist`.
2. У Settings → Environment Variables задати змінні з `.env.example` окремо для Production і Preview.
3. Задати `ALLOWED_ORIGINS` (адреса Production і шаблон preview) та ліміти.
4. Після розгортання виконати перевірки з `docs/architecture/API.md` і `docs/architecture/pwa.md`.

Заголовки безпеки й кешування `sw.js` лежать у `vercel.json`.

## Документація

- `CLAUDE.md`: постійні інструкції проєкту.
- `docs/architecture/STACK.md`, `docs/architecture/ARCHITECTURE.md`, `docs/architecture/API.md`: технології, архітектура, контракти.
- `docs/architecture/decisions.md`: журнал рішень.
- `docs/architecture/states.md`: стани екранів (завантаження, порожньо, помилка).
- `docs/quality/accessibility.md`: доступність і токени.
- `docs/architecture/pwa.md`: встановлення, офлайн, оновлення.
- `docs/quality/test-report.md`: звіт перевірок за сценаріями ТЗ.
- `docs/content/content-guide.md`: як наповнювати базу компонентів (для косметолога).
- `docs/content/content-inventory.md`, `CONTENT_TODO.md`: який контент є, а якого бракує.
- `docs/setup/ci-setup.md`, `docs/setup/setup-security.md`: CI і налаштування GitHub, безпека.
- `CHANGELOG.md`: що змінювалося.
