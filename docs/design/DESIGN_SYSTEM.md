# Дизайн-система Skinread

Що з дизайн-системи вже є в коді і звідки воно взялося. Джерело правди: Figma-файл
`skin_read`, сторінка «Page 1», секція «Section 1» (вузол 2:19). Усі значення лежать у
`src/styles/tokens.css`. Перевірити їх наочно можна на сторінці `/design`.

Позначки в колонці «Звідки»:
- **Figma**: змінна, стиль або компонент у Figma;
- **макет**: значення взяте з шару в макеті, але у Figma ще не оформлене стилем;
- **код**: додано в коді, у Figma цього поки немає. Такі рядки варто перенести у Figma.

## Кольори

| Назва в брифі | Токен | Значення | Звідки |
|---|---|---|---|
| black | `--color-black`, `--color-text`, `--color-primary` | #0B0B0C | Figma (змінна) |
| purple | `--color-purple`, `--color-focus` | #7B61FF | Figma (змінна) |
| purpleText | `--color-link` | #5A3FE0 | макет |
| white | `--color-white`, `--color-bg`, `--color-surface` | #FFFFFF | макет |
| surface | `--color-surface-muted` | #F3F3F1 | макет |
| line | `--color-border` | #E6E6E3 | макет |
| divider | `--color-divider` | #EFEFEC | макет |
| textSecondary | `--color-text-secondary` | #3A3A37 | макет |
| textTertiary | `--color-text-muted` | #5E5E5A | макет |
| controlBorderRow | `--color-control-border` | **#8A8A85** (у макеті #CFCFCB) | код |
| hydration | `--color-hydration` | #3E7BFA | макет |
| oil | `--color-oil` | #F2B33D | макет |
| sensitivity | `--color-sensitivity` | #FF6A4D | макет |
| — | `--color-glass` | білий 70% | макет (кнопка «назад», трек прогресу) |

**Змінено проти макета:** рамка радіо й чекбокса `#CFCFCB` → `#8A8A85`. Причина: контраст
`#CFCFCB` на білому 1,56:1, а для елементів керування потрібно щонайменше 3:1 (WCAG 1.4.11).
`#8A8A85` дає 3,47:1 на білому і 3,12:1 на `surface`. Затверджено 2026-11-26.
`controlBorder` (#B8B8B4, рамка в картці) не перенесено: версія «картки» не верстається.

Контраст тексту (мінімум 4,5:1): black 19,7; textSecondary 11,4; textTertiary 6,5;
purpleText 6,5 на білому, на `surface` трохи менше, але всі вище 5,8.

## Фон

Білий + три розмиті плями (синя, фіолетова, коралова), заливка 75%, layer blur 96 у Figma
(у CSS це `blur(48px)`, бо CSS рахує радіус, а Figma діаметр). Положення, розмір і
непрозорість плям для кожного екрана скопійовано з груп «фон»: заставка (12:215),
Welcome (4:116), тест з аркушем (27:565, 27:654), аналіз (29:793).
Компонент: `src/ui/Background`, варіанти `splash`, `welcome`, `sheet`, `analysis`.

**Примітка.** Шар «noise» у Figma це не шум, а білий радіальний градієнт з непрозорістю
15%. На заставці він лежить над плямами, тож у коді це легка біла вуаль (`--color-veil`,
приблизно 8% білого). На інших екранах він під плямами і нічого не змінює, тому там його немає.
Якщо потрібен справжній зернистий шум, його треба намалювати у Figma.

## Шрифти

- **Fixel Display** (MacPaw, OFL), усі 9 накреслень, `src/styles/fonts/fixel/`.
- **Geologica** (Monokrom, OFL): Bold і Italic, `src/styles/fonts/geologica/`.
  Логотип вставлено як SVG з Figma, тож для нього шрифт не потрібен.

| Стиль | Розмір / інтерліньяж | Накреслення | Токени |
|---|---|---|---|
| Hero (Welcome) | 52 | ExtraBold | `--font-size-hero` |
| Заголовок екрана | 32 / 36 | ExtraBold | `--font-size-xl`, `--line-height-title` |
| Основний текст, підзаголовок | 16 / 22 | Medium | `--font-size-md`, `--line-height` |
| Заголовок варіанта | 17 | Medium, вибраний SemiBold | `--font-size-option` |
| Опис варіанта | 13 / 18 | Regular | `--font-size-footnote`, `--line-height-footnote` |
| Посилання | 15 | Medium | `--font-size-link` |
| Мітка розділу | 12, CAPS, letter-spacing 1 | Medium | `--font-size-caption` |

Текстових стилів у Figma ще немає: розміри взято з брифу й текстових шарів.
Розміри менші за 16 дозволено лише для допоміжного тексту (рішення від 2026-11-26).

## Сітка, відступи, радіуси, тіні

- Екран 393 × 852, 4 колонки, gutter 11 (`--grid-gutter`), поля 20 (`--space-page`).
- Відступи кратні 4: `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16,
  `--space-page` 20, `--space-5` 24, `--space-6` 32.
- Радіуси: чекбокс 7 (`--radius-xs`), кнопки й рядки 16 (`--radius-md`),
  аркуш 28 (`--radius-sheet`).
- Тінь кнопки: 0 4 10 чорний 25% (`--shadow-button`, Figma effect style «01»).
- Мінімальна зона натискання 44 (`--tap-target`), висота кнопки 52 (`--button-height`).

## Компоненти в коді

| Компонент | Де | Звідки |
|---|---|---|
| Logo (`full` 284×76, `compact` 104×64) | `src/ui/Logo` | Figma: logo01, logo 02 (SVG експортувала авторка) |
| Background | `src/ui/Background` | Figma: групи «фон» на кожному екрані |
| Button (`primary`, `secondary`) | `src/ui/Button` | Figma: PrimaryButton 13:311, SecondaryButton 13:312 |
| Button `text` | `src/ui/Button` | код: тиха дія фіолетовим текстом, у Figma немає |
| Chip `row` | `src/ui/Chip` | Figma: Test / OptionRow 29:749 разом із Test / Radio і Test / Checkbox |
| Chip `card` | `src/ui/Chip` | код: той самий рядок із тонкою рамкою для інших екранів |
| ProgressBar | `src/ui/ProgressBar` | макет, у Figma не компонент |
| BackButton | `src/ui/BackButton` | макет, у Figma не компонент |
| Sheet | `src/ui/Sheet` | макет (аркуш тесту), у Figma не компонент |

## Що варто перенести у Figma

1. **BackButton**: коло 44, білий 70% + backdrop blur 10, шеврон 18, колір black.
   Шеврон і галочка в коді намальовані заново (2 лінії), бо файли іконок з Figma завантажити
   не вдалося: звірте товщину лінії (зараз 1,8).
2. **Progress**: 182 × 6, радіус 3, трек білий 70%, заповнення black.
3. **Sheet**: білий, радіус 28 зверху, тінь 0 4 16 чорний 8%.
4. **Рамка радіо й чекбокса** `#8A8A85` замість `#CFCFCB`.
5. **Стан Disabled для кнопки**: фон surface, текст textTertiary, без тіні (у Figma його немає).
6. **Лічильник «01 / 12»** у Figma набраний шрифтом Onest; у коді Fixel Display, бо інших шрифтів
   у дизайн-системі немає.
7. **Таб-бар** (нижня навігація): у Figma його ще немає. У коді скляна панель із радіусом 20 зверху,
   активна вкладка на «surface», текст SemiBold.
8. **Картки на інших екранах** (Головна, профіль, догляд): білі, радіус 16, тінь 0 4 16 чорний 6%.
9. **Підказка над варіантами**: «Обери один варіант.» для одного вибору (у Figma на питанні 1
   «Обери варіант, який буває найчастіше.», але це формулювання підходить не всім питанням).
