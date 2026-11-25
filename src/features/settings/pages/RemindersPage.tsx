import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useAppStore, useAppStoreApi } from '@/store';
import { Chip } from '@/ui';
import { TimeField } from '../components/TimeField';
import { REMINDERS, type ReminderId } from '../utils/reminders';
import styles from '../styles/settings.module.css';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Only the switches and the time are saved here. Real notifications come later, and the screen
// says so. No streaks, no "you missed a day": a reminder is a convenience, never a duty.
export function RemindersPage() {
  const store = useAppStoreApi();
  const reminders = useAppStore((state) => state.settings.reminders);

  const change = (id: ReminderId, patch: { enabled?: boolean; time?: string | null }) => {
    const { actions } = store.getState();
    actions.settings.update({ reminders: { ...reminders, [id]: { ...reminders[id], ...patch } } });
  };

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/profile/settings">
        {t('settings.back')}
      </Link>
      <h1>{t('settings.remindersTitle')}</h1>
      <p>{t('settings.remindersIntro')}</p>
      <p role="note" className={styles.notice}>
        {t('settings.remindersLater')}
      </p>

      {REMINDERS.map((reminder) => {
        const current = reminders[reminder.id];
        return (
          <fieldset key={reminder.id} className={styles.group}>
            <legend>{t(reminder.labelKey)}</legend>
            <Chip
              kind="checkbox"
              name={`reminder-${reminder.id}`}
              value={reminder.id}
              label={t(reminder.labelKey)}
              selected={current.enabled}
              onChange={() =>
                change(reminder.id, {
                  enabled: !current.enabled,
                  // the first time it is switched on it gets a starting time
                  time: current.time ?? reminder.defaultTime,
                })
              }
            />
            {current.enabled ? (
              <TimeField
                label={t('settings.reminderTime', { name: t(reminder.labelKey) })}
                value={current.time ?? reminder.defaultTime}
                onChange={(value) =>
                  change(reminder.id, { time: TIME_PATTERN.test(value) ? value : null })
                }
              />
            ) : null}
          </fieldset>
        );
      })}
    </section>
  );
}
