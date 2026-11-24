# CONTENT_TODO

Список контенту, якого бракує або який чекає затвердження косметологом. Кожен запис: що саме, де використовується, хто закриває.

## Етап 3: тексти опитувальника, яких немає в матеріалах (заповнює вручну авторка / косметолог)

Усі записи в `src/content/questionnaire.json` мають статус `draft`: тексти взято дослівно з ТЗ (розділ 09), але косметолог їх ще не затвердила. У режимі `public` тест не показується, поки записи не стануть `verified`.

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

<!-- content-audit:start -->
## Записи, що чекають наповнення або затвердження (створено автоматично)

Список оновлює `npm run content:audit`. Вручну цей розділ не редагуй.

### placeholder

- recommendations.json: placeholder-recommendation-1
- ingredient-groups.json: placeholder-group-1
- ingredient-groups.json: placeholder-group-2
- ingredients.json: placeholder-ingredient-1
- ingredients.json: placeholder-ingredient-2
- compat-rules.json: placeholder-rule-1
- safety-messages.json: safety-note-prescribed_derm_treatment
- safety-messages.json: safety-note-pregnancy_or_planning
- safety-messages.json: safety-note-other_limits
- product-categories.json: placeholder-category-1
- product-categories.json: placeholder-category-2

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
- safety-messages.json: safety-emergency
- safety-messages.json: safety-see_doctor
- disclaimer.json: medical-disclaimer

<!-- content-audit:end -->
