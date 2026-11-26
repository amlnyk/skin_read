import { useState } from 'react';
import { t } from '@/i18n';
import { Button, Modal } from '@/ui';
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

// One step of the routine as a row of a list: the "done" mark, the name (a tap opens the details),
// how often and where it stands. The purpose, what to look for, the warnings for this profile and
// the editing buttons are in the modal; the row only says in words that there are warnings.
export function StepCard(props: Props) {
  const { name, number } = props;
  const [open, setOpen] = useState(false);
  return (
    <li className={styles.row}>
      <input
        type="checkbox"
        className={styles.check}
        checked={props.done}
        aria-label={`${t('care.doneToday')}: ${name}`}
        onChange={(event) => props.onToggleDone(event.target.checked)}
      />
      <div className={styles.text}>
        <h3 className={styles.title}>
          <button
            type="button"
            className={styles.open}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {`${number}. ${name}`}
          </button>
        </h3>
        <p className={styles.meta}>
          <span>{t(`frequency.${props.frequency}`)}</span>
          <span>{t(`stepStatus.${props.status}`)}</span>
          {props.warnings.length > 0 ? <span>{t('care.hasWarnings')}</span> : null}
        </p>
      </div>

      {open ? (
        <Modal
          title={`${number}. ${name}`}
          onClose={() => setOpen(false)}
          actions={
            <>
              <div className={styles.modalActions}>
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
                <Button
                  variant="text"
                  ariaLabel={t('care.removeLabel', { name })}
                  onClick={props.onRemove}
                >
                  {t('care.remove')}
                </Button>
              </div>
              <Button fullWidth onClick={() => setOpen(false)}>
                {t('care.detailsClose')}
              </Button>
            </>
          }
        >
          <dl className={styles.facts}>
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
            <div>
              <dt>{t('care.timeOfUse')}</dt>
              <dd>{props.slot === 'am' ? t('care.tabAm') : t('care.tabPm')}</dd>
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
          </dl>
        </Modal>
      ) : null}
    </li>
  );
}
