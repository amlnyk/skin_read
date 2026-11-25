import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// The PWA plugin builds the manifest and the service worker. Rules (stage 13):
// - static files (js, css, html, icons) are precached, so the app opens offline;
//   the content files (src/content/data/*.json) are compiled into the js chunks, so they are cached with them;
// - requests to /api/ are NEVER cached and never answered by the navigation fallback;
// - a new version waits for the person's choice (registerType 'prompt'), it is not applied silently.
const pwa = VitePWA({
  registerType: 'prompt',
  // The registration is bundled from src/main.tsx: the CSP forbids inline scripts.
  injectRegister: false,
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'Skin Barrier',
    short_name: 'Skin Barrier',
    description: 'Освітній помічник із догляду за шкірою та аналізу складу засобів',
    lang: 'uk',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Keep in sync with --color-bg in src/styles/tokens.css.
    theme_color: '#f2f2f7',
    background_color: '#f2f2f7',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
      },
    ],
  },
});

export default defineConfig({
  // Tests do not need the PWA plugin.
  plugins: [react(), ...(process.env['VITEST'] ? [] : [pwa])],
  resolve: {
    alias: {
      '@fixtures': fileURLToPath(new URL('./tests/fixtures', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Security rule: no source maps in the production build.
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        // tests and their helpers live in __tests__ folders (docs/architecture/ARCHITECTURE.md, 3)
        '**/__tests__/**',
        'src/test/**',
        'src/**/index.ts',
        'src/**/*.d.ts',
        'src/main.tsx',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        // Overall floor. The logic layer is held to a higher bar (it is empty for now: passes).
        lines: 70,
        'src/logic/**': { lines: 90 },
      },
    },
  },
});
