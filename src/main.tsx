import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createAppConfig } from './app/app.config';
import { createServices } from './app/compositionRoot';
import { createAppRouter } from './app/router';
import { t } from '@/i18n';
import { parseEnv } from '@/lib/env';
import { createConsoleLogger } from '@/lib/logger';
import { ServicesProvider } from '@/lib/services';
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

  createRoot(container).render(
    <StrictMode>
      <ServicesProvider services={createServices(env.value)}>
        <App router={createAppRouter()} />
      </ServicesProvider>
    </StrictMode>,
  );
}
