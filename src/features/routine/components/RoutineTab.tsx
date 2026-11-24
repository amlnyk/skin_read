import { useState } from 'react';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { ADDABLE_CATEGORIES, canAddCategory, explainStep } from '@/logic/routine';
import type { ProfileAnalysis } from '@/logic/profile';
import { Button, Modal } from '@/ui';
import type { ProductCategory, Routine } from '@/types';
import { categoryName, componentNames, purposeText, stepName, warningText } from '../describe';
import { StepCard } from './StepCard';
import styles from './RoutineTab.module.css';

type Props = {
  routine: Routine;
  analysis: ProfileAnalysis;
  doneIds: readonly string[];
  onMove: (stepId: string, direction: 'up' | 'down') => void;
  onRemove: (stepId: string) => void;
  onAdd: (category: ProductCategory) => void;
  onToggleDone: (stepId: string, done: boolean) => void;
};

// The steps of one routine (morning or evening) with the editing buttons.
export function RoutineTab({
  routine,
  analysis,
  doneIds,
  onMove,
  onRemove,
  onAdd,
  onToggleDone,
}: Props) {
  const { content } = useServices();
  const bundle = content.bundle;
  const [adding, setAdding] = useState(false);

  const doneCount = routine.steps.filter((step) => doneIds.includes(step.id)).length;

  return (
    <div className={styles.tab}>
      <p aria-live="polite">
        {t('care.doneSummary', { done: doneCount, total: routine.steps.length })}
      </p>
      <p className={styles.hint}>{t('care.doneHint')}</p>

      {routine.steps.length === 0 ? <p>{t('care.emptyRoutine')}</p> : null}
      <ol className={styles.list}>
        {routine.steps.map((step, index) => {
          const explanation = explainStep(step, routine.slot, analysis, bundle);
          return (
            <StepCard
              key={step.id}
              number={index + 1}
              name={stepName(step, bundle)}
              slot={explanation.timeOfUse}
              frequency={step.frequency}
              status={step.status}
              purpose={purposeText(explanation.purposeId, bundle)}
              components={componentNames(explanation.componentsToLookFor, bundle)}
              warnings={explanation.personalWarnings.map((warning) => warningText(warning, bundle))}
              done={doneIds.includes(step.id)}
              canMoveUp={index > 0}
              canMoveDown={index < routine.steps.length - 1}
              onMoveUp={() => onMove(step.id, 'up')}
              onMoveDown={() => onMove(step.id, 'down')}
              onRemove={() => onRemove(step.id)}
              onToggleDone={(done) => onToggleDone(step.id, done)}
            />
          );
        })}
      </ol>

      <Button fullWidth variant="secondary" onClick={() => setAdding(true)}>
        {t('care.add')}
      </Button>

      {adding ? (
        <Modal
          title={t('care.addTitle')}
          onClose={() => setAdding(false)}
          actions={
            <Button fullWidth variant="secondary" onClick={() => setAdding(false)}>
              {t('care.addCancel')}
            </Button>
          }
        >
          <div className={styles.categories}>
            {ADDABLE_CATEGORIES.filter((category) => canAddCategory(routine.slot, category)).map(
              (category) => (
                <Button
                  key={category}
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    onAdd(category);
                    setAdding(false);
                  }}
                >
                  {categoryName(category)}
                </Button>
              ),
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
