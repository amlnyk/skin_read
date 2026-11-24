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
  },
  onboarding: {
    title: 'Вітаємо',
    stub: 'Тут буде онбординг. Це тимчасова заглушка.',
    skip: 'Пропустити (тимчасово)',
  },
} as const;
