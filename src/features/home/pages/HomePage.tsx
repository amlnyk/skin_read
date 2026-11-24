import { Link } from 'react-router-dom';
import disclaimer from '@/content/disclaimer.json';
import { t } from '@/i18n';
import { MedicalDisclaimer } from '@/ui';

export function HomePage() {
  return (
    <section>
      <h1>{t('nav.home')}</h1>
      <p>{t('common.inDevelopment')}</p>
      <Link to="/test">{t('home.startTest')}</Link>
      <MedicalDisclaimer text={disclaimer.text} />
    </section>
  );
}
