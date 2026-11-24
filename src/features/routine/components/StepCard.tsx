import { t } from '@/i18n';
import { Button } from '@/ui';
import type { Frequency, Slot, StepStatus } from '@/types';
import styles from './StepCard.module.css';

type Props = {
  number: number;
  name: string;
  slot: Slot;
  frequency: Frequency;
  status: StepStatus;
  purpose: string;
  /** Names of the ingredient groups to look for; empty while the content has none. */
  components: readonly string[];
  warnings: readonly string[];
  done: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleDone: (done: boolean) => void;
};

// One step of the routine: where it stands, what it is for, what to look for and the warnings.
export function StepCard(props: Props) {
  const { name, number } = props;
  return (
    <li className={styles.card}>
      <h3>{`${number}. ${name}`}</h3>
      <dl className={styles.facts}>
        <div>
          <dt>{t('care.timeOfUse')}</dt>
          <dd>{props.slot === 'am' ? t('care.tabAm') : t('care.tabPm')}</dd>
        </div>
        <div>
          <dt>{t('care.frequency')}</dt>
          <dd>{t(`frequency.${props.frequency}`)}</dd>
        </div>
        <div>
          <dt>{t('care.status')}</dt>
          <dd>{t(`stepStatus.${props.status}`)}</dd>
        </div>
        <div>
          <dt>{t('care.purpose')}</dt>
          <dd>{props.purpose}</dd>
        </div>
        <div>
          <dt>{t('care.lookFor')}</dt>
          <dd>
            {props.components.length > 0 ? (
              <ul>
                {props.components.map((component, index) => (
                  <li key={`${component}-${index}`}>{component}</li>
                ))}
              </ul>
            ) : (
              t('common.contentPending')
            )}
          </dd>
        </div>
        {props.warnings.length > 0 ? (
          <div>
            <dt>{t('care.warnings')}</dt>
            <dd>
              <ul>
                {props.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>

      <label className={styles.done}>
        <input
          type="checkbox"
          checked={props.done}
          onChange={(event) => props.onToggleDone(event.target.checked)}
        />
        <span>{t('care.doneToday')}</span>
      </label>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={!props.canMoveUp}
          ariaLabel={t('care.moveUpLabel', { name })}
          onClick={props.onMoveUp}
        >
          {t('care.moveUp')}
        </Button>
        <Button
          variant="secondary"
          disabled={!props.canMoveDown}
          ariaLabel={t('care.moveDownLabel', { name })}
          onClick={props.onMoveDown}
        >
          {t('care.moveDown')}
        </Button>
        <Button variant="text" ariaLabel={t('care.removeLabel', { name })} onClick={props.onRemove}>
          {t('care.remove')}
        </Button>
      </div>
    </li>
  );
}
