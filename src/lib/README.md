# lib

Порти (інтерфейси) та адаптери без UI: сховище, час, id, логер, env, Result.

- можна імпортувати: `@/schemas`, `@/types`;
- не можна: features, ui, store, logic, app;
- інтерфейси лежать у `ports.ts`, реалізації підставляються в `app/compositionRoot.ts`;
- підтеки (`storage/`) мають `index.ts`; ззовні імпортується `@/lib/storage`, а не файл усередині.
