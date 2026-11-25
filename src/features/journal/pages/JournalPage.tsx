import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { dateAfter, DEFAULT_JOURNAL_CONFIG } from '@/logic/journal';
import { answersFromProfile } from '@/logic/profile';
import { QUESTION_IDS } from '@/schemas';
import { useAppStoreApi } from '@/store';
import { Button } from '@/ui';
import { EntryForm } from '../components/EntryForm';
import { EntryList } from '../components/EntryList';
import { SuggestionBanner } from '../components/SuggestionBanner';
import { useJournal } from '../hooks/useJournal';
import { localDate } from '../today';
import styles from './JournalPage.module.css';

export function JournalPage() {
  const { ids } = useServices();
  const store = useAppStoreApi();
  const navigate = useNavigate();
  const { entries, profile, products, visibility, suggestion, now } = useJournal();
  const [adding, setAdding] = useState(false);

  // "Update the profile": the question about the state of the skin opens with the suggested state
  // already ticked. Nothing is saved until the user confirms the result (the revision goes +1 then).
  const updateProfile = () => {
    if (!profile || !suggestion) return;
    const answers = answersFromProfile(profile);
    // "Stable" would contradict a state that keeps coming back, so it is not ticked again.
    answers[QUESTION_IDS.conditions] = [
      ...profile.conditions.filter((condition) => condition !== 'stable'),
      ...suggestion.conditions,
    ];
    const stamp = new Date(now).toISOString();
    store.getState().actions.testDraft.set({
      answers,
      currentQuestionId: QUESTION_IDS.conditions,
      startedAt: stamp,
      updatedAt: stamp,
    });
    navigate(`/test?only=${QUESTION_IDS.conditions}`);
  };

  // "Not now": the banner hides for a few days, then may come back if the entries still say so.
  const later = () => {
    store.getState().actions.settings.update({
      profileSuggestionSnoozedUntil: dateAfter(now, DEFAULT_JOURNAL_CONFIG.snoozeDays),
    });
  };

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/profile">
        {t('journal.back')}
      </Link>
      <h1>{t('journal.title')}</h1>
      <p>{t('journal.intro')}</p>

      {suggestion ? (
        <SuggestionBanner symptoms={suggestion.symptoms} onUpdate={updateProfile} onLater={later} />
      ) : null}

      {adding ? (
        <EntryForm
          today={localDate(now)}
          visibility={visibility}
          products={products}
          newId={() => ids.next()}
          onSave={(entry) => {
            store.getState().actions.journal.add(entry);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button fullWidth onClick={() => setAdding(true)}>
          {t('journal.add')}
        </Button>
      )}

      <EntryList
        entries={entries}
        products={products}
        onDelete={(id) => store.getState().actions.journal.remove(id)}
      />
    </section>
  );
}
