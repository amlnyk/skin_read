import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore } from '@/store';
import { BackButton, Background, Button, Logo } from '@/ui';
import { Features } from '../components/Features';
import { Limits } from '../components/Limits';
import { Welcome } from '../components/Welcome';
import styles from '../styles/onboarding.module.css';

const STEPS = [Welcome, Features, Limits] as const;

// Shown once: the flag is saved in the store, the guard sends the user here until it is set.
// Step 1 is the Figma Welcome screen (the loading screen with the logo lives in the app shell).
export function OnboardingPage() {
  const navigate = useNavigate();
  const complete = useAppStore((state) => state.actions.onboarding.complete);
  const [index, setIndex] = useState(0);
  const [loginNote, setLoginNote] = useState(false);
  const Step = STEPS[index] ?? Welcome;
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  // The note about accounts disappears by itself after a few seconds.
  useEffect(() => {
    if (!loginNote) return;
    const timer = window.setTimeout(() => setLoginNote(false), 3500);
    return () => window.clearTimeout(timer);
  }, [loginNote]);

  const goTo = (next: number) => {
    setLoginNote(false);
    setIndex(next);
  };

  const start = () => {
    complete();
    navigate('/test', { replace: true });
  };

  return (
    <Background variant="welcome" animated>
      <main className={styles.page}>
        <header className={styles.header}>
          {isFirst ? (
            <Logo variant="compact" label={t('brand.name')} />
          ) : (
            <BackButton onClick={() => goTo(index - 1)} label={t('onboarding.back')} />
          )}
          <p className={isFirst ? styles.srOnly : styles.stepLabel}>
            {t('onboarding.stepLabel', { current: index + 1, total: STEPS.length })}
          </p>
        </header>

        <div className={styles.content}>
          <Step />
        </div>

        <div className={styles.actions}>
          {loginNote ? (
            <p className={styles.note} role="status">
              {t('onboarding.loginLater')}
            </p>
          ) : null}
          {isFirst ? (
            <>
              <Button fullWidth onClick={() => goTo(1)}>
                {t('onboarding.begin')}
              </Button>
              {/* Accounts come later (decision 2026-11-26): the button is kept from the design. */}
              <Button fullWidth variant="secondary" onClick={() => setLoginNote((shown) => !shown)}>
                <span className={styles.loginQuestion}>{t('onboarding.loginQuestion')}</span>
                <span className={styles.loginAction}>{t('onboarding.loginAction')}</span>
              </Button>
            </>
          ) : isLast ? (
            <Button fullWidth onClick={start}>
              {t('onboarding.start')}
            </Button>
          ) : (
            <Button fullWidth onClick={() => goTo(index + 1)}>
              {t('onboarding.next')}
            </Button>
          )}
        </div>
      </main>
    </Background>
  );
}
