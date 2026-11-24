import { t } from '@/i18n';

export function Welcome() {
  return (
    <section>
      <h1>{t('onboarding.welcomeTitle')}</h1>
      <p>{t('onboarding.welcomeText')}</p>
      <p>{t('onboarding.welcomeProfile')}</p>
    </section>
  );
}
