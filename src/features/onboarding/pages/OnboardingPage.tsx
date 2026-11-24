import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore } from '@/store';
import { Button } from '@/ui';
import { Features } from '../components/Features';
import { Limits } from '../components/Limits';
import { Welcome } from '../components/Welcome';
import styles from './OnboardingPage.module.css';

const STEPS = [Welcome, Features, Limits] as const;

// Shown once: the flag is saved in the store, the guard sends the user here until it is set.
export function OnboardingPage() {
  const navigate = useNavigate();
  const complete = useAppStore((state) => state.actions.onboarding.complete);
  const [index, setIndex] = useState(0);
  const Step = STEPS[index] ?? Welcome;
  const isLast = index === STEPS.length - 1;

  const start = () => {
    complete();
    navigate('/test', { replace: true });
  };

  return (
    <main className={styles.page}>
      <p className={styles.step}>
        {t('onboarding.stepLabel', { current: index + 1, total: STEPS.length })}
      </p>
      <div className={styles.content}>
        <Step />
      </div>
      <div className={styles.actions}>
        {isLast ? (
          <Button fullWidth onClick={start}>
            {t('onboarding.start')}
          </Button>
        ) : (
          <Button fullWidth onClick={() => setIndex(index + 1)}>
            {t('onboarding.next')}
          </Button>
        )}
        {index > 0 ? (
          <Button fullWidth variant="text" onClick={() => setIndex(index - 1)}>
            {t('onboarding.back')}
          </Button>
        ) : null}
      </div>
    </main>
  );
}
