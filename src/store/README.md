# store

Zustand-сховище застосунку (слайси: onboarding, testDraft, profile, routine, routineLog, products, scans, journal, needs, settings), збереження в localStorage, міграції.

- ключ збереження `skinbarrier:v1`, `version` піднімається при кожній зміні форми даних, для цього є `migrations/`;
- дані при відновленні проходять zod; якщо не пройшли, нічого не затирається (`persistence.kind === 'corrupt'`);
- якщо localStorage недоступний чи переповнений, застосунок працює в пам'яті (`persistence.kind === 'memory_only'`);
- сховище створює `createAppStore(adapter)`, адаптер приходить із composition root;
- можна імпортувати: `@/schemas`, `@/types`, `@/lib/ports`, `@/lib/result`;
- не можна: features, ui, logic, app;
- зовні імпортується лише через `@/store` (файл `index.ts`).
