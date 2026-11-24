import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { t } from '@/i18n';
import { Button, ProgressBar } from '@/ui';
import { ContradictionDialog } from '../components/ContradictionDialog';
import { QuestionView } from '../components/QuestionView';
import { useTestFlow } from '../hooks/useTestFlow';
import styles from './TestPage.module.css';

// `/test?only=<question ids separated by commas>` asks just those questions ("Change" on the profile).
export function TestPage() {
  const [params] = useSearchParams();
  const only = params.get('only');
  const scope = useMemo(() => (only ? only.split(',').filter(Boolean) : null), [only]);
  const flow = useTestFlow(scope);

  if (flow.finished) return <Navigate to="/test/result" replace />;

  const { current } = flow;
  if (!current) {
    return (
      <main className={styles.page}>
        <p>{t('test.empty')}</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ProgressBar
        value={flow.index + 1}
        max={flow.total}
        label={t('test.progressLabel')}
        valueText={t('test.progressText', { current: flow.index + 1, total: flow.total })}
      />
      <div className={styles.body}>
        <QuestionView
          key={current.id}
          question={current}
          answers={flow.answers}
          onSelect={flow.select}
          onOtherText={flow.setOtherText}
          onText={flow.setText}
        />
      </div>
      <div className={styles.bar}>
        <Button fullWidth disabled={!flow.canGoNext} onClick={flow.next}>
          {flow.isLast ? t('test.finish') : t('test.next')}
        </Button>
        <div className={styles.secondary}>
          {flow.index > 0 ? (
            <Button variant="secondary" onClick={flow.back}>
              {t('test.back')}
            </Button>
          ) : (
            <span />
          )}
          {current.required ? null : (
            <Button variant="text" onClick={flow.skip}>
              {t('test.skip')}
            </Button>
          )}
        </div>
      </div>
      {flow.pending ? <ContradictionDialog onChoose={flow.resolveContradiction} /> : null}
    </main>
  );
}
