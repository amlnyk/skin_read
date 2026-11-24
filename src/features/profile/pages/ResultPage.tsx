import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import disclaimer from '@/content/disclaimer.json';
import { t, type MessageKey } from '@/i18n';
import { useServices } from '@/lib/services';
import type { ProfileNote } from '@/logic/profile';
import { QUESTION_IDS, SAFETY_MESSAGE_IDS, safetyNoteId } from '@/schemas';
import { useAppStore } from '@/store';
import { Button, DoctorBanner, MedicalDisclaimer } from '@/ui';
import { EmergencyScreen } from '../components/EmergencyScreen';
import { TextBlocks } from '../components/TextBlocks';
import { ValueGroup } from '../components/ValueGroup';
import { groupValues, restrictionValues } from '../describeProfile';
import { useProfileBuilder } from '../hooks/useProfileBuilder';
import { optionLabel } from '../labels';
import styles from './ResultPage.module.css';

// Service notes: the ids come from the algorithm, the interface texts from i18n.
const NOTE_KEYS: Record<ProfileNote, MessageKey> = {
  type_unsure_retest: 'profile.noteTypeUnsureRetest',
  combination_text_pending: 'profile.noteCombinationTextPending',
  suggest_cycle_diary: 'profile.noteSuggestCycleDiary',
};

// Shown after the test: the proposed profile. It is saved only when the user confirms it.
export function ResultPage() {
  const { content } = useServices();
  const { built, confirm } = useProfileBuilder();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);
  const careScenario = useAppStore((state) => state.careSetup.scenario);

  if (!built) return <Navigate to="/test" replace />;

  const { profile, analysis } = built;
  const bundle = content.bundle;
  const questions = bundle.questionnaire;
  const messageText = (id: string) =>
    bundle.safetyMessages.find((message) => message.id === id)?.text ?? null;

  if (analysis.mode === 'emergency' && !acknowledged) {
    return (
      <EmergencyScreen
        message={messageText(SAFETY_MESSAGE_IDS.emergency)}
        onAcknowledge={() => setAcknowledged(true)}
      />
    );
  }

  const typeBlocks = analysis.textBlocks.filter((block) => block.kind === 'skin_type');
  const conditionBlocks = analysis.textBlocks.filter((block) => block.kind === 'condition');
  const restrictions = restrictionValues(profile, analysis.restrictions, questions);

  const onConfirm = () => {
    confirm();
    // The first confirmed profile leads to the question about the care the user already has.
    navigate(careScenario === null ? '/care' : '/profile');
  };

  return (
    <main className={styles.page}>
      {analysis.mode === 'see_doctor' || analysis.mode === 'emergency' ? (
        <DoctorBanner message={messageText(SAFETY_MESSAGE_IDS.seeDoctor)} />
      ) : null}
      <h1>{t('profile.resultTitle')}</h1>

      <section className={styles.section}>
        <h2>{t('profile.typeTitle')}</h2>
        <TextBlocks blocks={typeBlocks} content={bundle} />
      </section>
      {conditionBlocks.length > 0 ? (
        <section className={styles.section}>
          <h2>{t('profile.conditionsTitle')}</h2>
          <TextBlocks blocks={conditionBlocks} content={bundle} />
        </section>
      ) : null}

      <ValueGroup
        title={t('profile.goalsTitle')}
        values={groupValues('goals', profile, questions)}
      />
      <ValueGroup title={t('profile.restrictionsTitle')} values={restrictions} />

      {analysis.restrictions.medicalNotes.length > 0 ? (
        <section className={styles.section}>
          <h2>{t('profile.medicalTitle')}</h2>
          <ul>
            {analysis.restrictions.medicalNotes.map((flag) => (
              <li key={flag}>
                <strong>{optionLabel(questions, QUESTION_IDS.safetyFlags, flag)}</strong>
                <p>{messageText(safetyNoteId(flag)) ?? t('common.contentPending')}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.notes.length > 0 || analysis.contradictions.length > 0 || analysis.minorMode ? (
        <section className={styles.section}>
          <h2>{t('profile.notesTitle')}</h2>
          <ul>
            {analysis.contradictions.length > 0 ? <li>{t('profile.contradictionNote')}</li> : null}
            {analysis.minorMode ? <li>{t('profile.minorNote')}</li> : null}
            {analysis.notes.map((note) => (
              <li key={note}>{t(NOTE_KEYS[note])}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <MedicalDisclaimer text={disclaimer.text} />
      <Button fullWidth onClick={onConfirm}>
        {t('profile.confirm')}
      </Button>
    </main>
  );
}
