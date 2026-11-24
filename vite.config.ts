import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
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
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
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
