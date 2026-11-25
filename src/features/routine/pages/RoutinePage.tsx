import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { useServices } from '@/lib/services';
import type { RoutineNote } from '@/logic/routine';
import { SAFETY_MESSAGE_IDS } from '@/schemas';
import { Button, DoctorBanner, Modal } from '@/ui';
import type { Slot } from '@/types';
import { RoutineTab } from '../components/RoutineTab';
import { ScenarioChoice } from '../components/ScenarioChoice';
import { ShoppingNeeds } from '../components/ShoppingNeeds';
import { useCare } from '../hooks/useCare';
import styles from './RoutinePage.module.css';

type Tab = Slot | 'shopping';

const TABS: readonly { id: Tab; labelKey: MessageKey }[] = [
  { id: 'am', labelKey: 'care.tabAm' },
  { id: 'pm', labelKey: 'care.tabPm' },
  { id: 'shopping', labelKey: 'care.tabShopping' },
];

const NOTE_KEYS: Record<RoutineNote, MessageKey> = {
  follow_doctor_scheme: 'care.noteFollowDoctorScheme',
  no_extra_steps: 'care.noteNoExtraSteps',
};

// "Мій догляд": the question about the care the user already has, then the morning and evening
// routines and the list of what to look for.
export function RoutinePage() {
  const { content } = useServices();
  const care = useCare();
  const [tab, setTab] = useState<Tab>('am');
  const [changing, setChanging] = useState(false);
  const [confirmingRebuild, setConfirmingRebuild] = useState(false);

  const { profile, analysis, setup, routines } = care;

  if (!profile || !analysis) {
    return (
      <section className={styles.page}>
        <h1>{t('nav.care')}</h1>
        <Link to="/care/products">{t('products.link')}</Link>
        <p>{t('care.needsProfile')}</p>
        <Link to="/test">{t('care.startTest')}</Link>
      </section>
    );
  }

  const built = setup.scenario !== null && routines.length > 0;
  if (!built || changing) {
    return (
      <section className={styles.page}>
        <h1>{t('nav.care')}</h1>
        <ScenarioChoice
          onChoose={(scenario, owned) => {
            care.build(scenario, owned);
            setChanging(false);
          }}
          onCancel={built ? () => setChanging(false) : undefined}
        />
      </section>
    );
  }

  const seeDoctorText =
    content.bundle.safetyMessages.find((message) => message.id === SAFETY_MESSAGE_IDS.seeDoctor)
      ?.text ?? null;
  const showBanner = analysis.mode === 'see_doctor' || analysis.mode === 'emergency';
  const routine = tab === 'shopping' ? undefined : routines.find((item) => item.slot === tab);

  return (
    <section className={styles.page}>
      <h1>{t('nav.care')}</h1>
      <Link to="/care/products">{t('products.link')}</Link>
      {showBanner ? <DoctorBanner message={seeDoctorText} /> : null}

      {care.notes.length > 0 ? (
        <ul className={styles.notes}>
          {care.notes.map((note) => (
            <li key={note}>{t(NOTE_KEYS[note])}</li>
          ))}
        </ul>
      ) : null}

      {setup.builtForRevision !== profile.revision ? (
        <p role="status" className={styles.notice}>
          {t('care.profileChanged')}
        </p>
      ) : null}

      <div role="tablist" aria-label={t('care.tabsLabel')} className={styles.tabs}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`care-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="care-panel"
            className={tab === item.id ? `${styles.tab} ${styles.selected}` : styles.tab}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="care-panel" aria-labelledby={`care-tab-${tab}`}>
        {routine ? (
          <RoutineTab
            routine={routine}
            analysis={analysis}
            doneIds={care.doneIds(routine.slot)}
            onMove={(stepId, direction) => care.move(routine.slot, stepId, direction)}
            onRemove={(stepId) => care.remove(routine.slot, stepId)}
            onAdd={(category) => care.add(routine.slot, category)}
            onToggleDone={(stepId, done) => care.setDone(routine.slot, stepId, done)}
          />
        ) : (
          <ShoppingNeeds items={care.needs} states={care.needStates} onChange={care.setNeedState} />
        )}
      </div>

      <div className={styles.actions}>
        <Button fullWidth variant="secondary" onClick={() => setConfirmingRebuild(true)}>
          {t('care.rebuild')}
        </Button>
        <Button fullWidth variant="text" onClick={() => setChanging(true)}>
          {t('care.changeScenario')}
        </Button>
      </div>

      {confirmingRebuild ? (
        <Modal
          title={t('care.rebuildTitle')}
          onClose={() => setConfirmingRebuild(false)}
          actions={
            <>
              <Button
                fullWidth
                onClick={() => {
                  care.rebuild();
                  setConfirmingRebuild(false);
                }}
              >
                {t('care.rebuildConfirm')}
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setConfirmingRebuild(false)}>
                {t('care.rebuildCancel')}
              </Button>
            </>
          }
        >
          <p>{t('care.rebuildText')}</p>
        </Modal>
      ) : null}
    </section>
  );
}
