import { disclaimer } from '@/content';
import { t } from '@/i18n';
import { MedicalDisclaimer } from '@/ui';

// The disclaimer text is domain content (src/content/data/disclaimer.json), the rest is interface text.
export function Limits() {
  return (
    <section>
      <h1>{t('onboarding.limitsTitle')}</h1>
      <MedicalDisclaimer text={disclaimer.text} />
      <p>{t('onboarding.limitsData')}</p>
    </section>
  );
}
