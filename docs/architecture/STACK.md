# STACK.md: технології проєкту Skin Barrier

Політика версій. Перед стартом (етап 1) перевір актуальні стабільні версії
командою npm view <пакет> version, запиши точні версії в колонку «Версія»
нижче й зафіксуй через package-lock.json. Мажорні оновлення лише через запис
у docs/architecture/decisions.md. Назв пакетів не вигадувати: якщо не впевнена в точній
назві, спитай мене, я перевірю на npmjs.com.

## Клієнт
| Шар | Технологія | Навіщо | Етап | Версія |
|---|---|---|---|---|
| Мова | TypeScript (strict, noUncheckedIndexedAccess) | типобезпека, спільні типи для клієнта і сервера | 1 | typescript 6.0.3 |
| UI | React + react-dom | компонентний інтерфейс | 1 | react 19.3.1, react-dom 19.3.1 |
| Збірка | Vite + @vitejs/plugin-react | швидка розробка, оптимізована збірка, розділення коду на чанки | 1 | vite 8.3.8, @vitejs/plugin-react 6.3.0 |
| Роутинг | react-router-dom | маршрути, lazy-сторінки, guards | 1 | react-router-dom 7.18.6 |
| Стан | Zustand з persist middleware | прості сховища зі збереженням, без зайвого коду | 2 | zustand 5.1.0 |
| Схеми і типи | zod | єдине джерело істини: типи виводяться через z.infer; валідація контенту, збережених даних, імпорту, API | 2 | zod 4.6.7 |
| Стилі | CSS Modules + CSS custom properties (src/styles/tokens.css) | ізоляція стилів; редизайн заміною токенів без переписування компонентів | 1 | вбудовано |
| Рядки інтерфейсу | власний типізований словник src/i18n/uk.ts і функція t() | усі тексти UI в одному місці, готовність до інших мов | 1B | власний код |
| Сховище | localStorage через інтерфейс StorageAdapter; IndexedDB через idb-keyval для фото | офлайн, без акаунта; заміна адаптера без змін логіки | 2, 11 | idb-keyval 6.3.0 |
| PWA | vite-plugin-pwa (Workbox) | установлення на телефон, офлайн | 13 | заповнити |
| Зображення | canvas API, власна функція resizeImage | зменшення й очищення EXIF перед надсиланням | 11 | вбудовано |

## Сервер (лише тут секрети)
| Шар | Технологія | Навіщо | Етап |
|---|---|---|---|
| Runtime | Vercel Functions (Node.js, TypeScript), папка api/ | проксі до ШІ | 11 |
| ШІ | Anthropic API (vision) через @anthropic-ai/sdk; модель із ANTHROPIC_MODEL | читання складу з фото | 11 |
| Ліміти | стартово in-memory; опційно @upstash/ratelimit і @upstash/redis | захист від зловживань і витрат | 11 |
| Валідація | zod, ті самі схеми з src/schemas/api.ts | єдиний контракт клієнта і сервера | 11 |

## Якість і процес
- Тести: Vitest, @testing-library/react, @testing-library/user-event, jsdom,
@vitest/coverage-v8. Необов'язково Playwright для трьох e2e-смоуків.
- Статичний аналіз: ESLint (flat config), typescript-eslint, eslint-plugin-
react-hooks, eslint-plugin-jsx-a11y, правила меж модулів (eslint-plugin-
boundaries або no-restricted-imports; Claude обирає те, що працює з нашою
версією ESLint, і пояснює вибір), Prettier, EditorConfig.
- Git-гаки: husky і lint-staged (на pre-commit: eslint, prettier, gitleaks).

Встановлено на етапі 1B (точні версії): @vitest/coverage-v8 5.1.1, eslint-plugin-jsx-a11y 6.10.2, husky 9.1.7, lint-staged 17.6.2, @types/node 26.6.6. Prettier 3.10.1. Межі модулів: вбудований `no-restricted-imports` (плагін boundaries не потрібен, див. docs/architecture/decisions.md). Пакети `@testing-library/user-event`, `depcheck` поки не встановлені: додамо, коли знадобляться. `tsx` встановлено на етапі 2 (скрипт `scripts/content/audit.ts`).
CI: actions/checkout v7, actions/setup-node v7, gitleaks/gitleaks-action v3.
- Скрипти TypeScript: tsx (для scripts/content/audit.ts).
- CI: GitHub Actions. Залежності: Dependabot, npm audit, depcheck. Секрети:
gitleaks.

## Інфраструктура
GitHub (репозиторій, pull request, Actions). Vercel (Preview на кожен PR,
Production із гілки main, змінні середовища по середовищах).

## Свідомо НЕ використовуємо
- Next.js і SSR: контент статичний, достатньо SPA на Vite.
- Redux, MobX: достатньо Zustand.
- UI-кіти (MUI, Chakra, Ant) і Tailwind: дизайн із Figma підключається
токенами й власними компонентами.
- Аналітика, трекери, зовнішні CDN і шрифти: приватність і CSP.
- ORM і база даних (поки): шлях до Supabase описано в ARCHITECTURE.md, розділ
13.
- Власна автентифікація.
- lodash, moment, axios: є нативні fetch, Intl, structuredClone.
- localStorage для фото: ліміт близько 5 МБ, використовуємо IndexedDB.

## Змінні середовища
| Змінна | Де | Секрет | Приклад | Призначення |
|---|---|---|---|---|
| VITE_APP_ENV | клієнт | ні | development, preview, production | позначка середовища |
| VITE_CONTENT_POLICY | клієнт | ні | demo або public | які записи контенту показувати |
| VITE_FEATURE_PHOTO_SCAN | клієнт | ні | true або false | вмикає фото-режим |

| VITE_FEATURE_SIMPLIFY_AI | клієнт | ні | true або false | вмикає «Пояснити простіше» |
| ANTHROPIC_API_KEY | сервер | так | не в репозиторії | доступ до ШІ |
| ANTHROPIC_MODEL | сервер | ні | назва моделі (claude-sonnet-5-5 або claude-haiku-5-5) | вибір моделі |
| ALLOWED_ORIGINS | сервер | ні | через кому: прод-домен і шаблон Preview-адрес проєкту | перевірка Origin |
| DAILY_LIMIT | сервер | ні | 200 | денний ліміт запитів до ШІ |
| RATE_LIMIT_PER_HOUR | сервер | ні | 10 | ліміт на IP за годину |
| UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN | сервер | так | опційно | надійний ліміт |
| LOG_LEVEL | сервер | ні | warn | рівень логів |

Правила: змінні з префіксом VITE_ публічні й не можуть бути секретами. Усі
змінні перелічено в .env.example без значень. Локально значення лежать у
.env.local (в .gitignore), у хмарі задаються в налаштуваннях Vercel окремо
для Production, Preview і Development. Клієнтські змінні читаються лише через
src/lib/env.ts (перевірка zod при старті), серверні лише через
api/_lib/env.ts.
