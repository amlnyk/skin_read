import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { useAppStore } from '@/store';
import { createExampleData } from '../exampleData';

// Developer screen: shows the whole app state and lets you write a sample / reset.
// The route exists only in the dev build (see app/router.tsx); the marker below must not
// appear in the production bundle (scripts/setup-stage2.ps1 and the CI build check it).
export function DevStatePage() {
  const state = useAppStore((s) => s);
  const { clock } = useServices();

  const json = JSON.stringify(
    state,
    (key, value: unknown) => (key === 'actions' ? undefined : value),
    2,
  );

  const writeExample = () => {
    const { actions } = state;
    const example = createExampleData(state, new Date(clock.now()).toISOString());
    actions.onboarding.set(example.onboarding);
    actions.testDraft.set(example.testDraft);
    actions.products.set(example.products);
    actions.journal.set(example.journal);
  };

  return (
    <main data-marker="skinbarrier-dev-state-page">
      <h1>{t('dev.stateTitle')}</h1>
      <p>{`${t('dev.persistence')}: ${state.persistence.kind}`}</p>
      <button type="button" onClick={writeExample}>
        {t('dev.writeExample')}
      </button>
      <button type="button" onClick={() => state.actions.resetAll()}>
        {t('dev.reset')}
      </button>
      <pre>{json}</pre>
    </main>
  );
}
