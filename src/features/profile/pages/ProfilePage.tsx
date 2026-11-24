import { t } from '@/i18n';

export function ProfilePage() {
  return (
    <section>
      <h1>{t('nav.profile')}</h1>
      <p>{t('common.inDevelopment')}</p>
    </section>
  );
}
