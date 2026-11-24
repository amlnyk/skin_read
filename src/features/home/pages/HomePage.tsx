import disclaimer from '@/content/disclaimer.json';
import { t } from '@/i18n';
import { MedicalDisclaimer } from '@/ui';

export function HomePage() {
  return (
    <section>
      <h1>{t('nav.home')}</h1>
      <p>{t('common.inDevelopment')}</p>
      <MedicalDisclaimer text={disclaimer.text} />
    </section>
  );
}
