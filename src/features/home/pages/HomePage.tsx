import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { useAppStoreApi } from '@/store';
import { Button, Chip, DoctorBanner, Logo } from '@/ui';
import type { Feeling, Slot } from '@/types';
import { TodayChecklist } from '../components/TodayChecklist';
import { useHomeSummary } from '../hooks/useHomeSummary';
import styles from '../styles/home.module.css';

const FEELINGS: readonly Feeling[] = ['good', 'so_so', 'bad'];

// "Сьогодні" (ТЗ, екран 08): the care of the day as a checklist, a quick mark of how the skin
// feels and the way into the calendar. Marks are drafts until "Зберегти": then they go to the
// routine log and today's journal entry. A mark counts for one day only, with no streaks.
export function HomePage() {
  const home = useHomeSummary();
  const store = useAppStoreApi();
  const { ids } = useServices();
  const [done, setDone] = useState<Record<Slot, string[]>>(home.done);
  const [feeling, setFeeling] = useState<Feeling | null>(home.todayEntry?.feeling ?? null);
  const [saved, setSaved] = useState(false);

  const toggle = (slot: Slot, stepId: string) => {
    setSaved(false);
    setDone((current) => ({
      ...current,
      [slot]: current[slot].includes(stepId)
        ? current[slot].filter((id) => id !== stepId)
        : [...current[slot], stepId],
    }));
  };

  const save = () => {
    const { actions } = store.getState();
    (['am', 'pm'] as const).forEach((slot) => {
      if (home.steps[slot].length > 0) {
        actions.routineLog.upsert({ date: home.today, slot, doneStepIds: done[slot] });
      }
    });
    if (feeling !== null) {
      if (home.todayEntry) {
        actions.journal.update(home.todayEntry.id, { feeling });
      } else {
        actions.journal.add({
          id: `journal-${ids.next()}`,
          date: home.today,
          feeling,
          symptoms: {},
          newProductIds: [],
          note: '',
        });
      }
    }
    setSaved(true);
  };

  const dateLabel = new Date(home.nowMs).toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const slots: Slot[] = home.firstSlot === 'am' ? ['am', 'pm'] : ['pm', 'am'];
  const hasSteps = home.steps.am.length + home.steps.pm.length > 0;

  return (
    <section className={styles.page}>
      <Logo variant="compact" label={t('brand.name')} />
      <header className={styles.head}>
        <h1 className={styles.title}>{t('nav.home')}</h1>
        <p className={styles.date}>{dateLabel}</p>
      </header>

      {home.profile === null ? (
        <section className={styles.card}>
          <p>{t('home.welcome')}</p>
          <Link to="/test" className={styles.primary}>
            {t('home.startTest')}
          </Link>
        </section>
      ) : (
        <>
          {home.mode === 'see_doctor' || home.mode === 'emergency' ? (
            <DoctorBanner message={home.seeDoctorText} />
          ) : null}

          {hasSteps ? (
            slots.map((slot) => (
              <TodayChecklist
                key={slot}
                slot={slot}
                steps={home.steps[slot]}
                done={done[slot]}
                onToggle={(stepId) => toggle(slot, stepId)}
              />
            ))
          ) : (
            <section className={styles.card}>
              <p>{t('home.careEmpty')}</p>
              <Link to="/care" className={styles.link}>
                {t('home.careBuild')}
              </Link>
            </section>
          )}

          <fieldset className={styles.card}>
            <legend className={styles.legend}>{t('home.feelingTitle')}</legend>
            <div className={styles.chips}>
              {FEELINGS.map((value) => (
                <Chip
                  key={value}
                  kind="radio"
                  name="today-feeling"
                  value={value}
                  label={t(`journal.feelingOption.${value}`)}
                  selected={feeling === value}
                  onChange={() => {
                    setSaved(false);
                    setFeeling(value);
                  }}
                />
              ))}
            </div>
          </fieldset>

          <Link to="/journal" className={styles.calendarLink}>
            {t('home.calendarLink')}
          </Link>

          <div className={styles.saveBar}>
            {saved ? (
              <p className={styles.saved} role="status">
                {t('home.saved')}
              </p>
            ) : null}
            <Button fullWidth onClick={save}>
              {t('home.save')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
