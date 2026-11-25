# lib

Порти (інтерфейси) та адаптери без UI: сховище, час, id, логер, env, Result.

- можна імпортувати: `@/schemas`, `@/types`;
- не можна: features, ui, store, logic, app;
- інтерфейси лежать у `ports.ts`, реалізації підставляються в `app/compositionRoot.ts`;
- підтеки (`storage/`) мають `index.ts`; ззовні імпортується `@/lib/storage`, а не файл усередині.

Підтеки етапу 11:
- `ai/`: `HttpLabelReader`, клієнт серверної функції `/api/analyze-label` (20 с, помилки значеннями, відповідь перевіряє zod зі `@/schemas`). Ключа ШІ тут немає й бути не може.
- `image/`: стиснення фото на пристрої (`resizeImage`: довша сторона ≤1600 px, JPEG 0,8, ≤1,5 МБ). Браузерні частини (декодування, canvas) лише в `browserImage.ts`, решта працює в тестах через `ImageDeps`.
- `idb/`: `PhotoStore` над IndexedDB (`idb-keyval`), ключ це id засобу. Фото не входять в експорт.
- `services/usePhoto.ts`: фото засобу як адреса для `<img>` (звільняється при виході з екрана).
- `pwa/`: `createUpdateNotifier`, стор «нова версія готова» для банера оновлення. Сама реєстрація service worker лише в `main.tsx` (`virtual:pwa-register`).
