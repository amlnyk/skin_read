import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { createAppConfig } from './app/app.config';
import { createComposition } from './app/compositionRoot';
import { createAppRouter } from './app/router';
import { describeContentError, loadBundledContent } from '@/content';
import { t } from '@/i18n';
import { parseEnv } from '@/lib/env';
import { createConsoleLogger } from '@/lib/logger';
import { createUpdateNotifier } from '@/lib/pwa';
import { ServicesProvider } from '@/lib/services';
import { StoreProvider } from '@/store';
import './styles/tokens.css';
import './styles/reset.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

const env = parseEnv(import.meta.env);
if (!env.ok) {
  // Misconfigured environment: show a plain message instead of a blank screen.
  // Only variable names are logged, never values.
  createConsoleLogger('error').error('Invalid environment variables', {
    variables: env.error.variables.join(','),
  });
  container.textContent = t('errors.config');
} else {
  const config = createAppConfig(env.value);
  document.title = config.appName;

  const content = loadBundledContent(config.CONTENT_POLICY);
  if (!content.ok) {
    const message = describeContentError(content.error);
    if (import.meta.env.DEV) {
      // The developer must see exactly which file and field is broken.
      throw new Error(message);
    }
    // Production: a plain message for the user; the file and field go to the log only.
    createConsoleLogger('error').error('Content failed validation', {
      file: content.error.file,
      path: content.error.path,
    });
    container.textContent = t('errors.content');
  } else {
    const { services, store } = createComposition(env.value, content.value);
    const updates = createUpdateNotifier();
    // The service worker exists only in the production build (it would hide changes in dev).
    // A new version is never applied silently: the person decides in the banner.
    if (import.meta.env.PROD) {
      const updateServiceWorker = registerSW({
        onNeedRefresh() {
          updates.markReady(() => {
            void updateServiceWorker(true);
          });
        },
      });
    }
    createRoot(container).render(
      <StrictMode>
        <ServicesProvider services={services}>
          <StoreProvider store={store}>
            <App router={createAppRouter()} updates={updates} />
          </StoreProvider>
        </ServicesProvider>
      </StrictMode>,
    );
  }
}
