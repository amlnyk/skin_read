import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore } from '@/store';
import { BackButton, Background, Button, TextInput } from '@/ui';
import { validateLogin, type LoginErrors } from '../utils/loginForm';
import styles from '../styles/login.module.css';

// A short pause so the button shows "signing in" like a real login does.
const SIGN_IN_DELAY_MS = 700;

// Login with a local account (decision 2026-11-26): there is no server yet, so the email is
// kept on this device only and the password is checked for length but never saved.
// When real accounts arrive, only `signIn` changes; the screen stays the same.
export function LoginPage() {
  const navigate = useNavigate();
  const hasProfile = useAppStore((state) => state.profile !== null);
  const setOnboarding = useAppStore((state) => state.actions.onboarding.set);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  // After the first attempt the hints follow the typing, so they disappear once fixed.
  const update = (nextEmail: string, nextPassword: string) => {
    if (checked) setErrors(validateLogin(nextEmail, nextPassword));
  };

  const signIn = () => {
    const found = validateLogin(email, password);
    setChecked(true);
    setErrors(found);
    if (found.email || found.password) return;
    setBusy(true);
    timer.current = window.setTimeout(() => {
      setOnboarding({ completed: true, accountEmail: email.trim() });
      navigate(hasProfile ? '/' : '/test', { replace: true });
    }, SIGN_IN_DELAY_MS);
  };

  return (
    <Background variant="welcome" animated>
      <main className={styles.page}>
        <header className={styles.header}>
          <BackButton onClick={() => navigate('/onboarding')} label={t('onboarding.back')} />
        </header>

        <div className={styles.content}>
          <h1 className={styles.title}>{t('login.title')}</h1>
          <p className={styles.subtitle}>{t('login.subtitle')}</p>

          <div className={styles.sheet}>
            <TextInput
              type="email"
              autoComplete="email"
              label={t('login.email')}
              value={email}
              maxLength={254}
              error={errors.email ? t('login.emailError') : undefined}
              onChange={(value) => {
                setEmail(value);
                update(value, password);
              }}
            />
            <TextInput
              type="password"
              autoComplete="current-password"
              label={t('login.password')}
              value={password}
              maxLength={128}
              error={errors.password ? t('login.passwordError') : undefined}
              onChange={(value) => {
                setPassword(value);
                update(email, value);
              }}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button fullWidth onClick={signIn} disabled={busy}>
            {busy ? t('login.busy') : t('login.submit')}
          </Button>
          <p className={styles.note}>{t('login.deviceNote')}</p>
        </div>
      </main>
    </Background>
  );
}
