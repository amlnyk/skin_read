import { useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '@/i18n';
import { BackButton, Background, Button, ProgressBar } from '@/ui';
import { AnalysisLoader, canAnimate } from '../components/AnalysisLoader';
import { ContradictionDialog } from '../components/ContradictionDialog';
import { QuestionView } from '../components/QuestionView';
import { useTestFlow } from '../hooks/useTestFlow';
import styles from './TestPage.module.css';

const RESULT = '/test/result';

/** "1" -> "01", as in the Figma counter "01 / 12". */
const pad = (value: number) => String(value).padStart(2, '0');

// `/test?only=<question ids separated by commas>` asks just those questions ("Change" on the profile).
export function TestPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const only = params.get('only');
  const scope = useMemo(() => (only ? only.split(',').filter(Boolean) : null), [only]);
  const flow = useTestFlow(scope);

  if (flow.finished) {
    // The analysis screen (Figma 01_analise) is a short pause while the profile is put together.
    // Without animation (reduced motion) it is skipped.
    return canAnimate() ? (
      <AnalysisLoader onDone={() => navigate(RESULT, { replace: true })} />
    ) : (
      <Navigate to={RESULT} replace />
    );
  }

  const { current } = flow;
  if (!current) {
    return (
      <Background variant="sheet">
        <main className={styles.page}>
          <p className={styles.empty}>{t('test.empty')}</p>
        </main>
      </Background>
    );
  }

  const exit = () => navigate(only ? '/profile' : '/', { replace: true });

  return (
    <Background variant="sheet" animated>
      <main className={styles.page}>
        <header className={styles.header}>
          {flow.index > 0 ? (
            <BackButton onClick={flow.back} label={t('test.back')} />
          ) : (
            <BackButton onClick={exit} label={t('test.exit')} />
          )}
          <div className={styles.progress}>
            <ProgressBar
              value={flow.index + 1}
              max={flow.total}
              label={t('test.progressLabel')}
              valueText={t('test.progressText', { current: flow.index + 1, total: flow.total })}
            />
          </div>
          <span className={styles.counter} aria-hidden="true">
            {t('test.counter', { current: pad(flow.index + 1), total: pad(flow.total) })}
          </span>
        </header>

        <QuestionView
          key={current.id}
          question={current}
          answers={flow.answers}
          onSelect={flow.select}
          onOtherText={flow.setOtherText}
          onText={flow.setText}
          footer={
            <>
              <Button fullWidth disabled={!flow.canGoNext} onClick={flow.next}>
                {flow.isLast ? t('test.finish') : t('test.next')}
              </Button>
              {current.required ? null : (
                <Button fullWidth variant="secondary" onClick={flow.skip}>
                  {t('test.skip')}
                </Button>
              )}
            </>
          }
        />
        {flow.pending ? <ContradictionDialog onChoose={flow.resolveContradiction} /> : null}
      </main>
    </Background>
  );
}
