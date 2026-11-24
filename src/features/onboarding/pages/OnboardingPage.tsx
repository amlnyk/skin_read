import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useOnboardingStore } from '@/store';

// STUB: the real onboarding arrives at a later stage.
export function OnboardingPage() {
  const navigate = useNavigate();
  const complete = useOnboardingStore((state) => state.complete);

  const skip = () => {
    complete();
    navigate('/', { replace: true });
  };

  return (
    <main>
      <h1>{t('onboarding.title')}</h1>
      <p>{t('onboarding.stub')}</p>
      <button type="button" onClick={skip}>
        {t('onboarding.skip')}
      </button>
    </main>
  );
}
