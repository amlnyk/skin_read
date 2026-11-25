# logic/safety

Оцінка ознак небезпеки з відповідей тесту: `evaluateSafety(answers)`.

- `emergency`: утруднене дихання або набряк губ чи язика (`EmergencyFlag`);
- `see_doctor`: сильна чи тривала реакція, болісний набряк чи печіння;
- прапорці лікарського призначення, вагітності й інших обмежень дають лише `medicalNotes`, режим не змінюють.

Тексти повідомлень тут не живуть: вони в `src/content/data/safety-messages.json`
(id в `@/schemas`: `SAFETY_MESSAGE_IDS`, `safetyNoteId`).

Правила: чисті функції.
- можна імпортувати: `@/schemas`, `@/types`, `@/lib/result`;
- не можна: react, DOM, store, features, ui, інші модулі lib, fetch;
- не можна `Date.now()`, `new Date()` без аргументів, `Math.random()`.
