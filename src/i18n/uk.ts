// All interface strings live here. JSX must not contain bare text: use t('key').
// Domain content (components, rules, disclaimer text) is NOT here: it lives in src/content.

export const uk = {
  nav: {
    label: 'Основна навігація',
    home: 'Головна',
    care: 'Мій догляд',
    scan: 'Сканер',
    reference: 'Довідник',
    profile: 'Профіль',
  },
  common: {
    loading: 'Завантаження…',
    inDevelopment: 'Розділ ще в розробці.',
  },
  disclaimer: {
    label: 'Медичне застереження',
  },
  errors: {
    title: 'Щось пішло не так',
    hint: 'Спробуй оновити екран. Твої дані не втрачено.',
    retry: 'Спробувати знову',
    config: 'Застосунок не вдалося запустити: некоректні налаштування середовища.',
    content: 'Застосунок не вдалося запустити: файли з даними довідника пошкоджені.',
  },
  persistence: {
    memoryOnly: 'Дані не зберігаються на цьому пристрої. Після закриття сторінки вони зникнуть.',
    corruptedTitle: 'Дані пошкоджені',
    corruptedText:
      'Збережені на цьому пристрої дані не вдалося прочитати. Нічого не видалено і не перезаписано. Спершу завантаж копію, потім за потреби скинь дані.',
    downloadRaw: 'Завантажити копію сирих даних',
    reset: 'Скинути',
    resetConfirmText: 'Збережені дані буде видалено без можливості відновлення. Скинути?',
    resetConfirm: 'Так, скинути',
    resetCancel: 'Скасувати',
  },
  dev: {
    stateTitle: 'Стан застосунку (лише для розробки)',
    persistence: 'Збереження',
    writeExample: 'Записати приклад',
    reset: 'Скинути',
  },
  onboarding: {
    title: 'Вітаємо',
    stub: 'Тут буде онбординг. Це тимчасова заглушка.',
    skip: 'Пропустити (тимчасово)',
  },
} as const;
