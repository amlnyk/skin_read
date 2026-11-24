import { t } from '@/i18n';

export function Features() {
  return (
    <section>
      <h1>{t('onboarding.featuresTitle')}</h1>
      <ul>
        <li>{t('onboarding.featureTest')}</li>
        <li>{t('onboarding.featureRoutine')}</li>
        <li>{t('onboarding.featureScan')}</li>
        <li>{t('onboarding.featureJournal')}</li>
      </ul>
    </section>
  );
}
