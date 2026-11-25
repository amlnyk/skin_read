import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { answersFromProfile } from '@/logic/profile';
import { QUESTION_IDS } from '@/schemas';
import { useAppStore, useAppStoreApi } from '@/store';
import { Button, Modal } from '@/ui';
import { ValueGroup } from '../components/ValueGroup';
import { groupValues, PROFILE_GROUPS, type ProfileGroup } from '../describeProfile';
import styles from './ProfilePage.module.css';

const SENSITIVE_QUESTIONS: string[] = [
  QUESTION_IDS.sex,
  QUESTION_IDS.cycle,
  QUESTION_IDS.cycleEffects,
];

export function ProfilePage() {
  const { content, clock } = useServices();
  const store = useAppStoreApi();
  const profile = useAppStore((state) => state.profile);
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!profile) {
    return (
      <section className={styles.page}>
        <h1>{t('nav.profile')}</h1>
        <p>{t('profile.empty')}</p>
        <Link to="/test">{t('profile.startTest')}</Link>
      </section>
    );
  }

  const questions = content.bundle.questionnaire;
  const nowIso = () => new Date(clock.now()).toISOString();

  // "Change": the profile becomes the answers again and only this group of questions is asked.
  const change = (group: ProfileGroup) => {
    const { actions } = store.getState();
    actions.testDraft.set({
      answers: answersFromProfile(profile),
      currentQuestionId: group.questionIds[0] ?? null,
      startedAt: nowIso(),
      updatedAt: nowIso(),
    });
    navigate(`/test?only=${group.questionIds.join(',')}`);
  };

  const retake = () => {
    store.getState().actions.testDraft.clear();
    navigate('/test');
  };

  // Sex and cycle are sensitive: they leave the profile and the saved answers.
  const deleteSensitive = () => {
    const { actions, testDraft } = store.getState();
    actions.profile.update({
      sex: null,
      cycle: { status: null, phases: [], effects: [] },
      revision: profile.revision + 1,
      updatedAt: nowIso(),
    });
    actions.testDraft.update({
      answers: Object.fromEntries(
        Object.entries(testDraft.answers).filter(([key]) => !SENSITIVE_QUESTIONS.includes(key)),
      ),
    });
    setConfirmingDelete(false);
  };

  return (
    <section className={styles.page}>
      <h1>{t('nav.profile')}</h1>
      <p className={styles.updated}>
        {t('profile.updatedAt', { date: new Date(profile.updatedAt).toLocaleDateString('uk-UA') })}
      </p>

      {PROFILE_GROUPS.map((group) => (
        <ValueGroup
          key={group.id}
          title={t(group.titleKey)}
          values={groupValues(group.id, profile, questions)}
          action={
            <Button variant="text" onClick={() => change(group)}>
              {t('profile.changeGroup', { group: t(group.titleKey) })}
            </Button>
          }
        />
      ))}

      <Link to="/profile/history">{t('scan.history')}</Link>

      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={retake}>
          {t('profile.retake')}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setConfirmingDelete(true)}>
          {t('profile.deleteSensitive')}
        </Button>
      </div>

      {confirmingDelete ? (
        <Modal
          title={t('profile.deleteTitle')}
          onClose={() => setConfirmingDelete(false)}
          actions={
            <>
              <Button fullWidth onClick={deleteSensitive}>
                {t('profile.deleteConfirm')}
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setConfirmingDelete(false)}>
                {t('profile.deleteCancel')}
              </Button>
            </>
          }
        >
          <p>{t('profile.deleteText')}</p>
        </Modal>
      ) : null}
    </section>
  );
}
