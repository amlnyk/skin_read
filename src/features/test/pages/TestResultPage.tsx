import { Navigate, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { Button } from '@/ui';
import { useTestFlow } from '../hooks/useTestFlow';
import styles from './TestResultPage.module.css';

// STUB: the result with the skin profile arrives at stage 4. For now the raw answers are saved.
export function TestResultPage() {
  const flow = useTestFlow();
  const navigate = useNavigate();

  if (!flow.finished) return <Navigate to="/test" replace />;

  const retry = () => {
    flow.restart();
    navigate('/test', { replace: true });
  };

  return (
    <main className={styles.page}>
      <h1>{t('test.resultTitle')}</h1>
      <Button onClick={retry}>{t('test.retry')}</Button>
    </main>
  );
}
