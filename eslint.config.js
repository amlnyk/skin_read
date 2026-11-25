import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------
// Architecture boundaries (docs/ARCHITECTURE.md, section 2) are enforced with the built-in
// `no-restricted-imports` rule: no extra plugin, works with ESLint 9 flat config.
// Cross-layer imports must use the `@/` alias (src/), so they can be recognised by name.
// ---------------------------------------------------------------------------

const LAYERS = [
  'app',
  'features',
  'logic',
  'content',
  'lib',
  'store',
  'ui',
  'i18n',
  'schemas',
  'types',
];

// Which layers each layer may import (through the alias). `app` may import everything.
const ALLOWED = {
  schemas: [],
  types: ['schemas'],
  logic: ['schemas', 'types'],
  content: ['schemas', 'types'],
  lib: ['schemas', 'types'],
  store: ['schemas', 'types'],
  ui: ['i18n'],
  i18n: [],
  features: ['logic', 'store', 'content', 'lib', 'ui', 'i18n', 'schemas', 'types'],
};

// Layers that may import only some files of `lib`.
const PARTIAL_LIB = {
  logic: ['result'],
  store: ['ports', 'result'],
};

// Third-party packages that must not appear in pure layers.
const IMPURE_PACKAGES = ['react', 'react-dom', 'react-router-dom', 'zustand', 'idb-keyval'];
const PURE_LAYERS = ['schemas', 'types', 'logic', 'i18n'];

// Rule for everyone: no deep imports into another module, no long relative paths.
const COMMON_PATTERNS = [
  ...['features', 'logic', 'ui', 'store', 'content', 'lib', 'schemas', 'types', 'i18n'].map(
    (layer) => ({
      group: [`@/${layer}/*/*`],
      message: `Не імпортуй внутрішні файли модуля. Звертайся до його index.ts: @/${layer}/<модуль> (для store, ui, i18n, schemas, types: @/${layer}).`,
    }),
  ),
  {
    group: ['../../*'],
    message:
      'Не підіймайся вгору на два і більше рівні (../../). Для іншого шару використовуй аліас @/.',
  },
];

function importRule(layer) {
  const allowed = new Set(ALLOWED[layer] ?? LAYERS);
  const partial = PARTIAL_LIB[layer];
  if (partial) allowed.add('lib');

  const patterns = [...COMMON_PATTERNS];

  for (const other of LAYERS) {
    if (allowed.has(other)) continue;
    patterns.push({
      group: [`@/${other}`],
      message: `Шар «${layer}» не може імпортувати з «${other}». Дивись docs/ARCHITECTURE.md, розділ 2.`,
    });
  }
  if (partial) {
    patterns.push({
      group: ['@/lib/*', ...partial.map((name) => `!@/lib/${name}`)],
      message: `Шар «${layer}» може імпортувати з lib лише: ${partial.join(', ')}.`,
    });
  }

  const paths = PURE_LAYERS.includes(layer)
    ? IMPURE_PACKAGES.map((name) => ({
        name,
        message: `Шар «${layer}» має бути чистим: пакет ${name} тут заборонений.`,
      }))
    : [];

  return { 'no-restricted-imports': ['error', { patterns, paths }] };
}

const CYRILLIC = '/[А-Яа-яІіЇїЄєҐґ]/';
const I18N_MESSAGE = 'Текст інтерфейсу пиши в src/i18n/uk.ts і підставляй через t("ключ").';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '.husky/_'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      // Security: user, ingredient, AI and content text is rendered as text only.
      'react/no-danger': 'error',
      // stage 14: a javascript: address in a link would run code; React only warns about it
      'react/jsx-no-script-url': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Accessibility.
  { files: ['**/*.tsx'], ...jsxA11y.flatConfigs.recommended },

  // Common import rules for all of src (also covers src/main.tsx and src/test).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: COMMON_PATTERNS }] },
  },
  // Per-layer rules (each block repeats the common patterns, rule options are not merged).
  ...LAYERS.filter((layer) => layer !== 'app').map((layer) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: importRule(layer),
  })),

  // Server functions (api/): own code, only the shared contract of src/schemas/api may be imported.
  {
    files: ['api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*'],
              message: 'У api/ немає аліасу @/. Спільний контракт: ../../src/schemas/api.js.',
            },
            {
              // a regex, because a negated group does not work for relative paths
              regex: '^(\\.\\./)+src/(?!schemas/api\\.js$)',
              message: 'З src можна імпортувати лише контракт ../../src/schemas/api.js.',
            },
          ],
          paths: ['react', 'react-dom', 'react-router-dom', 'zustand', 'idb-keyval'].map(
            (name) => ({
              name,
              message: 'Сервер не імпортує клієнтські пакети.',
            }),
          ),
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^VITE_/]',
          message: 'Змінні VITE_* публічні й потрапляють у збірку: серверу їх не читати.',
        },
      ],
    },
  },

  // logic must be pure and deterministic: no DOM, network, clock or randomness.
  {
    files: ['src/logic/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'fetch',
          'crypto',
        ].map((name) => ({
          name,
          message: 'logic чиста: усе зовнішнє приходить аргументом (порт).',
        })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Час передається аргументом (Clock).' },
        { object: 'Math', property: 'random', message: 'Випадковість передається аргументом.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() без аргументів заборонено в logic: час передається аргументом.',
        },
      ],
    },
  },

  // i18n: no bare strings in JSX (tests are exempt).
  {
    files: ['src/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'src/test/**'],
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: false, allowedStrings: [] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute > Literal[value=${CYRILLIC}]`,
          message: I18N_MESSAGE,
        },
        {
          selector: `JSXExpressionContainer Literal[value=${CYRILLIC}]`,
          message: I18N_MESSAGE,
        },
        {
          selector: `JSXExpressionContainer TemplateElement[value.raw=${CYRILLIC}]`,
          message: I18N_MESSAGE,
        },
        {
          selector: 'JSXAttribute[name.name=/^(aria-label|alt|title|placeholder)$/] > Literal',
          message: I18N_MESSAGE,
        },
      ],
    },
  },
);
