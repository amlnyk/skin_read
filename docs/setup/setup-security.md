# Налаштування безпеки (етап 0)

Ці кроки виконуються на вашому комп'ютері й у GitHub. Нічого з цього не вимагає ключів.

## 1. gitleaks (пошук секретів перед комітом)

1. Встанови gitleaks. Точну назву пакета перевір: `winget search gitleaks`, або завантаж реліз із сторінки проєкту gitleaks на GitHub.
2. Перевір: `gitleaks version`.
3. Перевірка всього репозиторію (після `git init` і першого коміту): `gitleaks detect --source . -v`. У новіших версіях команда може називатися `gitleaks git`: див. `gitleaks --help`.
4. Pre-commit перевірка. Файл `.git/hooks/pre-commit` (без розширення) з вмістом:

```sh
#!/bin/sh
gitleaks protect --staged --redact -v
```

   Якщо `protect` у твоїй версії відсутня, заміни на `gitleaks git --staged --redact -v` (див. `gitleaks git --help`). На етапі 1B це переїде в husky.

## 2. GitHub (коли підключимо репозиторій)

- Settings -> Code security: увімкнути Dependabot alerts і Dependabot security updates.
- Там само: Secret scanning і Push protection, якщо доступно для твого типу репозиторію.
- Файл .github/dependabot.yml уже є в проєкті.

## 3. Матеріали в content/source/

Перед першим push перевір, чи немає в них персональних даних (імена респондентів, контакти, відповіді опитування). Якщо репозиторій буде публічним, додай `content/source/` у .gitignore (рядок уже підготовлено закоментованим).
