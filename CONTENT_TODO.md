# CONTENT_TODO

Список контенту, якого бракує або який чекає затвердження косметологом. Кожен запис: що саме, де використовується, хто закриває.

## Етап 3: тексти опитувальника, яких немає в матеріалах (заповнює вручну авторка / косметолог)

Усі записи в `src/content/data/questionnaire.json` мають статус `draft`: тексти взято дослівно з ТЗ (розділ 09), але косметолог їх ще не затвердила. У режимі `public` тест не показується, поки записи не стануть `verified`.

- **Питання 1.** Описи трьох варіантів («Жирна…», «Суха…», «Нормальна / резистентна») та варіанта «Не впевнена(-ий)»: `description: null`. Джерело: окремий опитувальник косметолога (його немає в `content/source`). Закриває: косметолог.
- **Питання 6.1, уточнення ефектів (`q6_1_effects`).** У ТЗ є лише варіанти відповіді, самого формулювання питання немає: `text: null`, на екрані «Інформація готується». Закриває: авторка / косметолог.
- **Блок безпеки (`q9_safety_flags`, `q10_age_band`).** У ТЗ є лише перелік тем, формулювань питань немає: `text: null`. Назви варіантів `q9_safety_flags` перетворено з переліку ТЗ у називний відмінок («Сильної або тривалої реакції» → «Сильна або тривала реакція»). Блок має бути погоджений із профільним фахівцем (ТЗ, розділ 09). Закриває: косметолог.
- **Вікові категорії (`q10_age_band`).** Підписи «до 18», «18–24», «25–34», «35+» це механічний запис значень словника `AgeBand`, не з матеріалів косметолога (`proposed: true`). Потрібне затвердження.
- **Питання з прапорцем `proposed: true`** (рекомендовані доповнення з ТЗ, яких немає в опитувальнику косметолога): `q1_base_type:unsure`, `q7_products_count:none`, `q8_care_time:morning_only`, `q8_care_time:none`. Потрібне рішення, чи лишати.
- **Окреме уточнення щодо комбінованого типу шкіри** (ТЗ, питання 1, «рекомендоване доповнення»): не додано, чекає рішення.
- **Текст вікна суперечності** (питання 2: «Стабільна» разом з «Чутлива», «Реактивна» або «З висипаннями / запаленнями»). Заголовок «Уточни, що ближче до істини зараз» узято із завдання етапу, пояснювальний рядок у вікні нейтральний і тимчасовий (`src/i18n/uk.ts`, `test.contradictionText`). Потрібен текст косметолога.

## Етап 4: профіль і безпека (заповнює вручну авторка / косметолог)

- **Описи типів шкіри** (жирна, суха, нормальна): записи в `skin-types.json` мають назви з ТЗ (розділ 10), `description: null`. У матеріалах «готові тексти, надані авторкою» не знайдено. Закриває: косметолог.
- **Описи станів** (зневоднена, чутлива, реактивна, комбінована, з висипаннями, з пігментацією, з ознаками вікових змін, стабільна): `conditions.json`, назви з ТЗ, `description: null`. Окремий блок для комбінованої шкіри ТЗ прямо просить погодити з косметологом; чутлива й реактивна можуть мати спільний блок з додатковою обережністю для реактивної. Поки тексту немає, екран пише «Інформація готується», а для комбінованої додає примітку.
- **Тексти повідомлень безпеки** (`safety-messages.json`): «Негайно звернися за екстреною медичною допомогою.» і «Звернися за медичною допомогою.» це мої мінімальні переформулювання директив ТЗ (розділ 25) для користувача, статус `draft`. Потрібні затверджені формулювання.
- **Примітки до прапорців безпеки** (лікарське призначення, вагітність або планування, інші обмеження): записи `safety-note-*` це `placeholder`, тексту в ТЗ немає. Застосунок не повинен радити припиняти лікування (ТЗ, розділ 25). Закриває: косметолог.
- **Питання про невідкладні ознаки** (утруднене дихання, набряк губ чи язика): у тесті їх немає, бо в ТЗ немає ні формулювання, ні варіантів. Код уже вміє їх обробляти за id `breathing_difficulty` і `lip_or_tongue_swelling`. Потрібне рішення, чи додавати такі варіанти до блоку безпеки.
- **Службові примітки на екрані результату** (`uk.ts`, ключі `profile.note*`, `profile.minorNote`, `profile.contradictionNote`): нейтральні тимчасові формулювання про дії застосунку, не косметологічні поради. Перевірити тон.

## Етап 5: рутина догляду (заповнює вручну авторка / косметолог)

Файл `src/content/data/routine-steps.json`. Поки він містить лише три заглушки (очищення, зволоження, сонцезахист), на екрані «Мій догляд» кожен крок каже «Інформація готується».

- Для кожного базового кроку (очищення, зволоження, сонцезахист): що це за крок і для чого він (`purpose`), на які групи компонентів звернути увагу (`lookFor`: id груп із `ingredient-groups.json`).
- Кандидати на необов'язковий крок (`kind: optional`): назва, для чого, коли в день (`slots`), як часто (`frequency`), для яких цілей (`goals`), чи це антивіковий крок (`antiAging`), до яких груп реакцій належить (`reactionGroups`) і які побажання «уникати» порушує (`avoidTags`). Поки немає жодного перевіреного кандидата, необов'язкових кроків у схемі немає: це правильна поведінка.
- Питання до косметолога: чи є порядок кроків, коли необов'язковий крок стоїть у вечірній схемі (зараз він іде в кінці, вранці перед сонцезахистом), і чи потрібні додаткові обмеження для вагітності (зараз будь-яка медична примітка прибирає необов'язкові кроки).
- Тексти приміток на екрані догляду («У тебе є призначення лікаря…», «Додаткових кроків зараз не пропонуємо.») і назви категорій засобів («Очищення», «Зволоження», «Сонцезахист»…) це інтерфейсні рядки в `src/i18n/uk.ts`, не косметологічний зміст; перевірити тон і формулювання.

## Етап 6: довідник компонентів (заповнює вручну авторка / косметолог)

Матеріали в `content/source/message.txt` це ТЗ: у ньому є лише назви груп компонентів (розділ 19), список уподобань «уникати» (питання 5) і опис картки. Фактів про окремі компоненти там немає, тому окремих записів у `ingredients.json` немає (лишились дві технічні заглушки), а групи в `ingredient-groups.json` мають назву й `description: null`.

- **Картки компонентів.** Для кожного компонента потрібні: назва українською, назва INCI, синоніми (українські й англійські), категорія, пояснення простими словами, властивості, застереження (із станами шкіри, до яких вони стосуються), особливості застосування, відомі взаємодії, джерело. Без цього пошук за назвою «ніацинамід» чи «niacinamide» не знайде картку (знайде лише групу «Ніацинамід»). Закриває: косметолог, передає список із полями або таблицю.
- **Описи груп** (27 записів, `description: null`). Що це за група простими словами. Закриває: косметолог.
- **Перелік комедогенних олій** (`comedogenic_oils`): група `placeholder`, у довіднику не показується. Потрібен список олій від косметолога (план, етап 6, п. 1).
- **Лексичні шаблони груп** (`patterns`, `draft`): силікони (`*cone`, `*siloxane`), сульфати (`sodium lauryl sulfate`, `sodium laureth sulfate`), парабени (`*paraben`), ароматизатори (`parfum`, `fragrance`, `aroma`), жирні спирти (`cetyl`, `cetearyl`, `stearyl`, `behenyl alcohol`). Взято з тексту плану, не з матеріалів косметолога: перевірити. Запис `*x` означає «закінчується на x»; точне правило зіставлення визначить розбір складу (етап 7). Для `alcohol_denat` шаблонів немає.
- **Поділ «Спирти».** У ТЗ одна група «Спирти», у плані «окремо денатурований спирт і жирні спирти». Зроблено дві групи: `alcohol_denat` («Денатурований спирт») і `fatty_alcohols` («Жирні спирти»). Підтвердити назви.
- **Зв'язок «уникати» з групами.** Питання 5 має значення `fragrance_essential_oils` і `alcohol`, а груп дві (`fragrance` і `essential_oils`) та `alcohol_denat`. Як вони відповідають одне одному, визначить етап 7.
- **Категорії компонентів** (поле `category`, на екрані фільтр): списку категорій немає, фільтр з'явиться, коли в картках будуть категорії.
- **Освітні матеріали.** Вкладка порожня. Потрібні матеріали (ТЗ, розділ 19: гормональні коливання, цикл, гоління та інші чинники) або рішення, що показувати.
- **Службові тексти довідника** (`uk.ts`, блок `reference.*`): підписи екрана й нейтральне речення про те, що компоненти не бувають «хорошими» чи «поганими» (з ТЗ, розділ 19). Перевірити тон.

## Етап 7: розбір складу і сумісність (заповнює вручну авторка / косметолог)

Двигун сумісності й розбір складу готові, але **даних для них немає**: ТЗ забороняє вигадувати правила, тому справжній `compat-rules.json` містить лише одну службову заглушку (`placeholder`), яку не видно в застосунку. Пара компонентів зараз завжди дає «Не виявлено відомих конфліктів у межах наявних даних» (це не гарантія) або «Недостатньо інформації».

- **Правила сумісності** (`compat-rules.json`). Для кожного правила: що поєднується (компонент або група з кожного боку), рівень (`caution`: потребує обережності, `info`: просто повідомлення), чи діє лише в одному слоті (`sameSlotOnly`: наприклад, лише ввечері разом), пояснення простими словами (`explanation`), порада щодо часу (`timingAdvice`: через день, в різний час доби тощо), пріоритет (`priority`: більше число важливіше), за яких станів шкіри чи реакцій правило посилюється до «Не рекомендовано для поточного профілю» (`escalateWhen`: `conditions` і `reactions`), джерело. Закриває: косметолог, таблицею.
- **Які пари потрібні в першу чергу.** У матеріалах нічого не названо. Прикладна пара з плану (ретиноїди й AHA ввечері разом) використана лише в тестах на вигаданому контенті (`tests/fixtures/inci-content.json`), у застосунок вона не потрапила.
- **Картки компонентів** потрібні й тут: без запису в довіднику компонент «невідомий», і пара з ним дає «Недостатньо інформації». Див. розділ етапу 6.
- **Синоніми й шаблони для розбору складу.** Розбір знаходить компонент за назвою INCI, синонімом (українським чи англійським), шаблоном групи (`patterns`) або з одруківкою. Чим повніші синоніми, тим менше позицій складу буде «невідомим». Правило шаблонів (рішення етапу 7): `*x` закінчується на x, `x*` починається з x, `*x*` містить x, інакше назва має збігатися повністю. Шаблони етапу 6 (`draft`) треба перевірити за цим правилом.
- **Порогові значення** розбору (`src/logic/config.ts`): мінімум 5 позицій, не більше 40 % нерозпізнаних, нечіткий пошук від 5 символів (1 помилка до 8 символів, 2 помилки від 9). Це робочі значення, не косметологічні факти; косметолог може сказати, що змінити.
- **Тексти екрана сумісності** (`uk.ts`, блок `compat.*`). Чотири статуси взято слово в слово зі ТЗ; решта (підписи, пояснення причин) мої. Перевірити тон, особливо речення про те, що пара «без правила» не гарантована.

## Етап 8: аналіз засобу під профіль (заповнює вручну авторка / косметолог)

Аналіз працює, але **на справжньому контенті майже завжди скаже «Недостатньо інформації»**: карток компонентів немає (лише дві службові заглушки), правил сумісності немає, група «активні» не позначена. Нічого не вигадано: чого немає, того не показано.

- **Таблиця «категорія опитувальника → групи компонентів»** (`src/logic/analyze/groupMap.ts`). Це домовленість про назви, не знання косметолога, тому її треба підтвердити: реакція «кислоти» шукається в групах acids, aha, bha, pha; «ретиноїди» в retinoids; «ароматизатори й ефірні олії» в fragrance, essential_oils; «консерванти й спирт» у preservatives, alcohol_denat; побажання «спирт» лише в alcohol_denat (жирні спирти не входять); «комедогенні олії» в comedogenic_oils. Питання: чи правильні групи, чи не бракує інших; у справжніх групах є aha, bha, pha, але немає загальної групи `acids`; чи потрібна вона, чи достатньо перелічених?
- **Які групи вважати «активними»** (поле `active: true` у `ingredient-groups.json`). Поки жодна не позначена, тож «У догляді вже є засіб з тієї ж активної групи» не спрацьовує. Кандидати для рішення: aha, bha, pha, retinoids, vitamin_c, azelaic_acid, niacinamide, peptides. Рішення за косметологом.
- **Застереження карток (`cautions`)** і **користь (`supports`)**: працюють лише коли в картці компонента є записи. `cautions`: стани профілю (`conditions`) і текст (простими словами). `supports`: рядки з переліку цілей (`reduce_breakouts`, `hydrate`, `reduce_oiliness`, `even_tone`, `anti_aging`, `maintain_healthy`). Це продовження розділів етапів 6 і 7.
- **Список комедогенних олій** (група `comedogenic_oils`, зараз placeholder): без нього побажання «уникати комедогенних олій» нічого не знаходить. Потрібен перелік компонентів або шаблонів назв.
- **Медичні примітки** (`medicalNotes`, наприклад вагітність): сьогодні аналіз лише каже «Обговори це з лікарем» і не називає жодного компонента. Якщо є перевірені правила («при вагітності обережно з ретиноїдами»), їх треба передати як правила з джерелом, і тільки тоді вони з'являться.
- **Тексти екрана** (`uk.ts`, блоки `scan.*`, `products.*`, `composition.*`): назви чотирьох статусів сканера й усі формулювання застережень мої. Перевірити тон, особливо «Може підходити» й «Це побажання, а не висновок про небезпеку».
- **Питання від першого етапу, ще без відповіді:** групи «Денатурований спирт» і «Жирні спирти» названі мною (група alcohol_denat і fatty_alcohols); підтвердити назви.

## Етап 9: аналіз усієї рутини (заповнює вручну авторка / косметолог)

Файл `src/content/data/observation-templates.json`: дванадцять записів. Дві фрази з ТЗ перенесено слово в слово як `draft`, десять заглушок (`placeholder`, `text: null`, `why: null`): на екрані «Аналіз мого догляду» вони дають «Інформація готується».

- **Тексти шаблонів** (`text`: що знайдено; `why`: чому це важливо), по одному на кожен запис: `obs-missing-cleanser`, `obs-missing-moisturizer`, `obs-conflict`, `obs-many-actives` (варіант для профілю без чутливості; є `draft` для чутливої шкіри), `obs-duplicate-active`, `obs-personal-restriction`, `obs-preference-mismatch`, `obs-incomplete-no-composition`, `obs-incomplete-low-coverage`, `obs-doctor-note`. Можна писати `{products}` (назви засобів), `{slots}` («Ранок», «Вечір»), `{names}` (компоненти або групи), `{categories}` (категорії). Закриває: косметолог.
- **Пояснення «чому» для спостережень «Бракує сонцезахисту» і «Бракує…»**: у ТЗ є лише речення «що знайдено» про сонцезахист, пояснення немає (`why: null` у `obs-missing-sunscreen`).
- **Затвердити дві фрази з ТЗ** (`obs-missing-sunscreen`, `obs-many-actives-sensitive`): вони `draft`, у режимі `public` не показуються, поки не стануть `verified`.
- **Поріг «багато активних засобів в один час»** (`MANY_ACTIVES_IN_SLOT = 2`, `src/logic/config.ts`): це робоче значення, не косметологічний факт. Чи змінювати його.
- **Що вважати «активним» засобом.** Зараз: засіб має компонент групи з `active: true` (позначок поки немає, див. етап 8), або людина сама віднесла його до категорії «Ексфоліант». Чи правильно рахувати так, чи потрібні інші ознаки (наприклад, окремий перелік відлущувальних груп).
- **Базові кроки, відсутність яких видно в аналізі**: зараз вранці зволоження й сонцезахист, ввечері очищення й зволоження (ранкове очищення «за потреби»). Підтвердити.
- **Правила сумісності** потрібні й тут: без них конфліктів у рутині не буде (див. етап 7).
- **Тексти екрана** (`uk.ts`, блок `analysis.*`): назви видів спостережень («Можливий конфлікт», «Багато активних засобів в один час» тощо), слова ступеня («Важливо», «Зверни увагу», «До відома») і службові рядки. Перевірити тон.

## Етап 10: щоденник, нагадування, керування даними (заповнює вручну авторка / косметолог)

Нового контенту цей етап не додає: нових JSON-записів немає, лічильники аудиту не змінюються. Нижче рішення, які я прийняла сама й які треба підтвердити.

- **Таблиця «симптом → стан профілю»** (`SYMPTOM_CONDITION`, `src/logic/journal/symptoms.ts`). Це **пропозиція**, не знання косметолога: сухість → зневоднена, почервоніння → чутлива, чутливість → чутлива, печіння → реактивна, висипання → висипи, лущення → зневоднена, жирність → без стану (банер не пропонує нічого). Підтвердити або виправити таблицю.
- **Тексти банера й екрана щоденника** (`uk.ts`, блоки `journal.*`, `settings.*`): тон, формулювання шкал 0–3 («немає», «трохи», «помітно», «сильно»), назви періодів циклу. Банер не називає причин.
- **Пороги банера** (`config.ts`): 4 записи за 14 днів з інтенсивністю 2–3. Це робочі значення плану, не медичні правила.
- **Відкладення банера «Не зараз»**: 7 днів (`JOURNAL_SNOOZE_DAYS`). План каже лише «не показувати знову після кожної відмови»; строк мій. Чи влаштовує.
- **Перемикачі полів щоденника (цикл, гоління)**: план каже «вмикається в Профілі». Я поставила їх на сторінку «Налаштування» (Профіль → Налаштування). Чи не краще на самому екрані профілю.
- **«Видалити все»** залишає позначку «онбординг пройдено», щоб застосунок не повертав на вітальні екрани й одразу можна було відновити копію з файлу. Чи так.
- **Фото (етап 11)**: зроблено. Фото в IndexedDB видаляються в «Видалити все», у «Видалити колекцію» (крім засобів, що були лише перевірені), після імпорту й окремою кнопкою; правила в `docs/architecture/decisions.md`, Етап 11, п. 10. Чи влаштовують правила.

## Етап 11: розпізнавання складу з фото (заповнює вручну авторка / косметолог)

Нового косметологічного контенту цей етап не додає: нових JSON-записів немає, лічильники аудиту не змінюються. Потрібна лише перевірка тону нових текстів інтерфейсу (`uk.ts`, блоки `scan.photo*`, `scan.consent*`, `scan.review*Photo*`, `photo.*`, `settings.photoExplain`, `settings.storedPhotos`, `settings.exportPhotosNote`, `settings.photosNotDeleted`).

- **Текст згоди** взято слово в слово з плану: «Фото етикетки буде надіслано сервісу ШІ лише для розпізнавання тексту. Знімок не зберігається на сервері. Профіль і щоденник не надсилаються.» Перед запуском у продакшені перевір, чи це правда для обраного постачальника ШІ (умови зберігання даних постачальником). Це юридичне питання, не моє.
- **Системна інструкція для моделі** (`api/_lib/visionProvider.ts`) взята з плану без змін. Змінювати лише із записом у `docs/architecture/decisions.md`.
- **Підказки до зйомки** («Тримай ближче», «Потрібне світло», «Знімай лише список складу»): тон і формулювання.
- **Поріг «фото нечітке»** (`LOW_CONFIDENCE = 0.6` у `ReviewPage.tsx`): це моє робоче значення, не правило. Нижче нього екран просить уважно переглянути список.
- **Назва моделі** (`ANTHROPIC_MODEL`): я її не вибираю й нікуди не записую. Обирає власниця проєкту в змінних середовища хоста.

## Етап 12: порівняння засобів і динаміка щоденника (заповнює вручну авторка / косметолог)

Нового косметологічного контенту цей етап не додає: нових JSON-записів немає, лічильники аудиту не змінюються. Потрібна перевірка тону нових текстів інтерфейсу (`uk.ts`, блок `compare.*`, нові ключі `journal.calendar*`, `journal.trend*`, `journal.day*`, `journal.event*`, `journal.legend*`, `journal.routineChange*`, `journal.weekday.*`, `journal.month.*`).

- **Які групи мають `active: true`.** Вердикт «схоже, ці засоби можуть виконувати подібну роль» (`likely_similar_function`) з'являється лише для спільної групи з `active: true`. У справжньому контенті `active` ще не виставлено, тому на справжніх даних цей вердикт поки не показується (покаже «частково» або «різні»). Потрібен список активних груп від косметолога.
- **Тексти вердиктів** (`compare.verdict.*`) і підпис про ефективність: тон і точність. Підпис взято слово в слово з плану.
- **Підпис під графіком** «Збіг у часі не означає причини.» взято з плану; пояснення про розриви («відсутність запису не означає, що симптому не було») моє: перевір.
- **Назви місяців і днів тижня** в календарі: стандартні, але тексти нові.

## Етап 13: шліфування, PWA, доступність, документація (заповнює вручну авторка / косметолог)

Нового косметологічного контенту цей етап не додає: JSON-записів додано не було, лічильники аудиту не змінюються (23 заготовки, 55 чернеток, 0 перевірених). Додано лише `src/content/data/version.json` (версії, не контент).

- **Тексти сторінок «Про застосунок і джерела даних», «Конфіденційність», «Медичне застереження»** (`uk.ts`, блоки `about.*`, `privacy.*`, `disclaimerPage.*`): це чернетки моїх формулювань на основі того, що застосунок справді робить. Потрібно перевірити тон і зміст. Окремо потрібна **юридична перевірка** твердження про приватність: що знімок «не зберігається на сервері» (так сказано й у тексті згоди з етапу 11), що сервер лічить запити за хешем адреси, що в застосунку немає акаунтів, реклами, аналітики й cookie. Правила самого ШІ-сервісу щодо оброблених даних я не знаю й у тексті не описував: перевір для вибраного постачальника.
- **Незалежність від брендів** («не повʼязаний з жодним брендом, нічого не продає»): це твердження про проєкт, підтверди, що воно правдиве.
- **Іконки застосунку** (`public/icon-*.png`, `favicon.svg`): тимчасові, абстрактне кільце. Потрібні затверджені іконки (графічний дизайн).
- **`contentVersion` у `src/content/data/version.json`** (`0.1.0`) і `updatedAt`: позначають стан чернеток. Змінюй їх при кожній зміні контенту; номер першої версії для публічного показу визнач сама.
- **Режим показу `public`**: поки немає жодного `verified`, екрани довідки порожні (це правильна поведінка). Для публічного показу потрібне затвердження текстів.

## Етап 14: аудит і звірка з ТЗ (заповнює вручну авторка / косметолог)

Головне для того, щоб застосунок реально аналізував склад (деталі: `docs/quality/tz-compliance.md`):

- **Картки компонентів** (`ingredients.json`): зараз 0. ТЗ (розділ 32) говорить про «декілька десятків поширених компонентів». Для кожного: INCI, назва українською, синоніми, група, просте пояснення, застереження, джерело. Без них на справжніх даних розпізнається майже нічого.
- **Правила сумісності** (`compat-rules.json`): зараз лише заготовка. Потрібна перевірена матриця (ТЗ, розділ 38).
- **Які групи активні** (`active: true`): без цього немає «багато активів», дублікатів активів і вердикту «схожа функція» в порівнянні.
- **Тексти головного екрана** (`uk.ts`, блок `home.*`): мої формулювання, перевір тон.
- **Ліміт витрат в обліковому записі Anthropic**: задати перед будь-яким розгортанням із ключем.

## Таблиці для косметолога (заповнює косметолог; інструкція: docs/content/content-guide.md)

- **`content/cosmetologist/ingredients.csv`**: 93 компоненти з назвами й групами (чернетки). Заповнити «Для чого», застереження, «Як застосовувати», джерело; перевірити групи; поставити «перевірено». Додати компоненти, яких бракує.
- **`content/cosmetologist/compat-rules.csv`**: поки порожня. Перевірена матриця сумісності.
- **`content/cosmetologist/groups.csv`**: опис груп, позначка «Активна група», перевірка шаблонів назв.
- Після кожної зміни: `npm run content:import`, підняти `contentVersion`.

<!-- content-audit:start -->
## Записи, що чекають наповнення або затвердження (створено автоматично)

Список оновлює `npm run content:audit`. Вручну цей розділ не редагуй.

### placeholder

- recommendations.json: placeholder-recommendation-1
- ingredient-groups.json: comedogenic_oils
- safety-messages.json: safety-note-prescribed_derm_treatment
- safety-messages.json: safety-note-pregnancy_or_planning
- safety-messages.json: safety-note-other_limits
- product-categories.json: placeholder-category-1
- product-categories.json: placeholder-category-2
- routine-steps.json: step-base-cleanser
- routine-steps.json: step-base-moisturizer
- routine-steps.json: step-base-sunscreen
- observation-templates.json: obs-missing-cleanser
- observation-templates.json: obs-missing-moisturizer
- observation-templates.json: obs-conflict
- observation-templates.json: obs-many-actives
- observation-templates.json: obs-duplicate-active
- observation-templates.json: obs-personal-restriction
- observation-templates.json: obs-preference-mismatch
- observation-templates.json: obs-incomplete-no-composition
- observation-templates.json: obs-incomplete-low-coverage
- observation-templates.json: obs-doctor-note

### draft

- questionnaire.json: q1_base_type
- questionnaire.json: q2_conditions
- questionnaire.json: q3_goals
- questionnaire.json: q4_reactions
- questionnaire.json: q5_avoid
- questionnaire.json: q6_sex
- questionnaire.json: q6_1_cycle
- questionnaire.json: q6_1_effects
- questionnaire.json: q7_products_count
- questionnaire.json: q8_care_time
- questionnaire.json: q9_safety_flags
- questionnaire.json: q10_age_band
- skin-types.json: skin-type-oily
- skin-types.json: skin-type-dry
- skin-types.json: skin-type-normal
- conditions.json: condition-dehydrated
- conditions.json: condition-sensitive
- conditions.json: condition-reactive
- conditions.json: condition-combination
- conditions.json: condition-breakouts
- conditions.json: condition-pigmentation
- conditions.json: condition-aging_signs
- conditions.json: condition-stable
- ingredient-groups.json: aha
- ingredient-groups.json: bha
- ingredient-groups.json: pha
- ingredient-groups.json: retinoids
- ingredient-groups.json: niacinamide
- ingredient-groups.json: azelaic_acid
- ingredient-groups.json: vitamin_c
- ingredient-groups.json: hyaluronic_acid
- ingredient-groups.json: glycerin
- ingredient-groups.json: ceramides
- ingredient-groups.json: panthenol
- ingredient-groups.json: squalane
- ingredient-groups.json: peptides
- ingredient-groups.json: zinc
- ingredient-groups.json: allantoin
- ingredient-groups.json: beta_glucan
- ingredient-groups.json: antioxidants
- ingredient-groups.json: surfactants
- ingredient-groups.json: fragrance
- ingredient-groups.json: essential_oils
- ingredient-groups.json: alcohol_denat
- ingredient-groups.json: fatty_alcohols
- ingredient-groups.json: preservatives
- ingredient-groups.json: sunscreen_filters
- ingredient-groups.json: silicones
- ingredient-groups.json: sulfates
- ingredient-groups.json: parabens
- ingredients.json: ing-aqua
- ingredients.json: ing-butylene-glycol
- ingredients.json: ing-propylene-glycol
- ingredients.json: ing-propanediol
- ingredients.json: ing-pentylene-glycol
- ingredients.json: ing-caprylic-capric-triglyceride
- ingredients.json: ing-xanthan-gum
- ingredients.json: ing-carbomer
- ingredients.json: ing-sodium-hydroxide
- ingredients.json: ing-citric-acid
- ingredients.json: ing-disodium-edta
- ingredients.json: ing-butyrospermum-parkii-butter
- ingredients.json: ing-dimethicone
- ingredients.json: ing-cyclopentasiloxane
- ingredients.json: ing-glycolic-acid
- ingredients.json: ing-lactic-acid
- ingredients.json: ing-mandelic-acid
- ingredients.json: ing-salicylic-acid
- ingredients.json: ing-betaine-salicylate
- ingredients.json: ing-gluconolactone
- ingredients.json: ing-lactobionic-acid
- ingredients.json: ing-retinol
- ingredients.json: ing-retinal
- ingredients.json: ing-retinyl-palmitate
- ingredients.json: ing-hydroxypinacolone-retinoate
- ingredients.json: ing-niacinamide
- ingredients.json: ing-azelaic-acid
- ingredients.json: ing-ascorbic-acid
- ingredients.json: ing-sodium-ascorbyl-phosphate
- ingredients.json: ing-magnesium-ascorbyl-phosphate
- ingredients.json: ing-ascorbyl-glucoside
- ingredients.json: ing-ethyl-ascorbic-acid
- ingredients.json: ing-tetrahexyldecyl-ascorbate
- ingredients.json: ing-sodium-hyaluronate
- ingredients.json: ing-hyaluronic-acid
- ingredients.json: ing-hydrolyzed-hyaluronic-acid
- ingredients.json: ing-glycerin
- ingredients.json: ing-ceramide-np
- ingredients.json: ing-ceramide-ap
- ingredients.json: ing-ceramide-eop
- ingredients.json: ing-ceramide-ns
- ingredients.json: ing-panthenol
- ingredients.json: ing-squalane
- ingredients.json: ing-palmitoyl-tripeptide-1
- ingredients.json: ing-palmitoyl-tetrapeptide-7
- ingredients.json: ing-acetyl-hexapeptide-8
- ingredients.json: ing-copper-tripeptide-1
- ingredients.json: ing-zinc-pca
- ingredients.json: ing-zinc-gluconate
- ingredients.json: ing-zinc-oxide
- ingredients.json: ing-allantoin
- ingredients.json: ing-beta-glucan
- ingredients.json: ing-tocopherol
- ingredients.json: ing-tocopheryl-acetate
- ingredients.json: ing-ferulic-acid
- ingredients.json: ing-resveratrol
- ingredients.json: ing-sodium-lauryl-sulfate
- ingredients.json: ing-sodium-laureth-sulfate
- ingredients.json: ing-cocamidopropyl-betaine
- ingredients.json: ing-coco-glucoside
- ingredients.json: ing-decyl-glucoside
- ingredients.json: ing-sodium-cocoyl-isethionate
- ingredients.json: ing-parfum
- ingredients.json: ing-linalool
- ingredients.json: ing-limonene
- ingredients.json: ing-citronellol
- ingredients.json: ing-geraniol
- ingredients.json: ing-lavandula-angustifolia-oil
- ingredients.json: ing-melaleuca-alternifolia-leaf-oil
- ingredients.json: ing-citrus-limon-peel-oil
- ingredients.json: ing-mentha-piperita-oil
- ingredients.json: ing-alcohol-denat
- ingredients.json: ing-cetearyl-alcohol
- ingredients.json: ing-cetyl-alcohol
- ingredients.json: ing-phenoxyethanol
- ingredients.json: ing-sodium-benzoate
- ingredients.json: ing-potassium-sorbate
- ingredients.json: ing-benzyl-alcohol
- ingredients.json: ing-methylparaben
- ingredients.json: ing-propylparaben
- ingredients.json: ing-titanium-dioxide
- ingredients.json: ing-octocrylene
- ingredients.json: ing-ethylhexyl-methoxycinnamate
- ingredients.json: ing-butyl-methoxydibenzoylmethane
- ingredients.json: ing-bis-ethylhexyloxyphenol-methoxyphenyl-triazine
- ingredients.json: ing-ethylhexyl-triazone
- ingredients.json: ing-cholesterol
- ingredients.json: ing-phytosphingosine
- ingredients.json: ing-ethylhexylglycerin
- ingredients.json: ing-sodium-pca
- ingredients.json: ing-urea
- ingredients.json: ing-glyceryl-stearate
- ingredients.json: ing-sodium-chloride
- safety-messages.json: safety-emergency
- safety-messages.json: safety-see_doctor
- observation-templates.json: obs-missing-sunscreen
- observation-templates.json: obs-many-actives-sensitive
- disclaimer.json: medical-disclaimer

<!-- content-audit:end -->
