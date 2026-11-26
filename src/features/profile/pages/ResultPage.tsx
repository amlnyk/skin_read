import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { disclaimer } from '@/content';
import { t, type MessageKey } from '@/i18n';
import { useServices } from '@/lib/services';
import type { ProfileNote } from '@/logic/profile';
import { buildBaseRoutine } from '@/logic/routine';
import { QUESTION_IDS, SAFETY_MESSAGE_IDS, safetyNoteId } from '@/schemas';
import { useAppStore } from '@/store';
import type { Mode } from '@/types';
import { BackButton, Background, Button, DoctorBanner, MedicalDisclaimer, Modal } from '@/ui';
import { EmergencyScreen } from '../components/EmergencyScreen';
import { TextBlocks } from '../components/TextBlocks';
import { ValueGroup } from '../components/ValueGroup';
import { groupValues } from '../utils/describeProfile';
import { useProfileBuilder } from '../hooks/useProfileBuilder';
import { optionLabel } from '../utils/labels';
import {
  avoidChips,
  lookForChips,
  pluralForm,
  recommendationsFor,
  splitTypeName,
} from '../utils/resultSummary';
import styles from './ResultPage.module.css';

// Service notes: the ids come from the algorithm, the interface texts from i18n.
const NOTE_KEYS: Record<ProfileNote, MessageKey> = {
  type_unsure_retest: 'profile.noteTypeUnsureRetest',
  combination_text_pending: 'profile.noteCombinationTextPending',
  suggest_cycle_diary: 'profile.noteSuggestCycleDiary',
};

// "Головне зараз" follows the mode of the profile (the order of the algorithm).
const PRIORITY_KEYS: Record<Mode, MessageKey> = {
  emergency: 'profile.priorityDoctor',
  see_doctor: 'profile.priorityDoctor',
  barrier_first: 'profile.priorityBarrier',
  standard: 'profile.priorityStandard',
};

// Short chip names for the restrictions; "none" and unknown ids give no chip.
const AVOID_CHIP_KEYS: Partial<Record<string, MessageKey>> = {
  acids: 'profile.avoidChip.acids',
  retinoids: 'profile.avoidChip.retinoids',
  fragrance_essential_oils: 'profile.avoidChip.fragrance_essential_oils',
  preservatives_alcohol: 'profile.avoidChip.preservatives_alcohol',
  other: 'profile.avoidChip.other',
  silicones: 'profile.avoidChip.silicones',
  sulfates: 'profile.avoidChip.sulfates',
  parabens: 'profile.avoidChip.parabens',
  alcohol: 'profile.avoidChip.alcohol',
  comedogenic_oils: 'profile.avoidChip.comedogenic_oils',
};

const STEP_KEYS = {
  one: 'profile.stepsOne',
  few: 'profile.stepsFew',
  many: 'profile.stepsMany',
} as const satisfies Record<string, MessageKey>;

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="m6 3.5 4.5 4.5L6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Shown after the test (Figma "result"): the proposed profile as a short summary; the full texts
// open in a sheet. It is saved only when the user confirms it.
export function ResultPage() {
  const { content } = useServices();
  const { built, confirm } = useProfileBuilder();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);
  const [details, setDetails] = useState(false);
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
  // One chip per component group: a reaction and an avoided component of the same group
  // (for example essential oils) give one chip, under a short name.
  const restrictionIds = [
    ...new Set<string>([...analysis.restrictions.reactions, ...analysis.restrictions.avoid]),
  ];
  const restrictions = restrictionIds.flatMap((id) => {
    if (id === 'other' && profile.reactionOtherText) return [profile.reactionOtherText];
    const key = AVOID_CHIP_KEYS[id];
    return key ? [t(key)] : [];
  });
  const recommendations = recommendationsFor(analysis.textBlocks, bundle.recommendations);
  const lookFor = lookForChips(
    recommendations,
    analysis.restrictions.reactions,
    analysis.minorMode,
  );
  const avoid = avoidChips(restrictions, recommendations);

  const typeName =
    (profile.baseType &&
      bundle.skinTypes.find((item) => item.baseType === profile.baseType)?.nameUk) ??
    optionLabel(questions, QUESTION_IDS.baseType, profile.baseType ?? 'unsure');
  const [typeMain, typeRest] = splitTypeName(typeName);

  const routines = buildBaseRoutine(profile, analysis, [], bundle).routines;
  const stepCount = (slot: 'am' | 'pm') =>
    routines.find((routine) => routine.slot === slot)?.steps.length ?? 0;
  const stepsText = (slot: 'am' | 'pm') => {
    const count = stepCount(slot);
    return t(STEP_KEYS[pluralForm(count)], { count });
  };

  const onConfirm = () => {
    confirm();
    // The first confirmed profile leads to the question about the care the user already has.
    navigate(careScenario === null ? '/care' : '/profile');
  };
  const openRoutine = () => {
    confirm();
    navigate('/care');
  };

  const isDoctorMode = analysis.mode === 'see_doctor' || analysis.mode === 'emergency';
  const hasNotes =
    analysis.notes.length > 0 || analysis.contradictions.length > 0 || analysis.minorMode;

  return (
    <Background variant="result" animated>
      <main className={styles.page}>
        <BackButton onClick={() => navigate('/')} label={t('profile.back')} />

        <header className={styles.header}>
          <h1 className={styles.caption}>{t('profile.resultTitle')}</h1>
          <h2 className={styles.type}>
            <span className={styles.typeMain}>{typeMain}</span>
            {typeRest ? (
              <>
                {' '}
                <span className={styles.typeRest}>{typeRest}</span>
              </>
            ) : null}
          </h2>
        </header>

        {isDoctorMode ? <DoctorBanner message={messageText(SAFETY_MESSAGE_IDS.seeDoctor)} /> : null}

        <button type="button" className={styles.priority} onClick={() => setDetails(true)}>
          <span className={styles.priorityHead}>
            <span className={styles.priorityLabel}>{t('profile.priorityLabel')}</span>
            <Chevron />
          </span>
          <span className={styles.priorityText}>{t(PRIORITY_KEYS[analysis.mode])}</span>
        </button>

        {profile.conditions.length > 0 ? (
          <section className={styles.card} aria-labelledby="result-states">
            <h3 id="result-states" className={styles.cardTitle}>
              {t('profile.statesTitle')}
            </h3>
            <ul className={styles.chips}>
              {profile.conditions.map((condition) => (
                <li key={condition} className={styles.stateChip}>
                  <span className={`${styles.dot} ${styles[`dot_${condition}`]}`} />
                  {optionLabel(questions, QUESTION_IDS.conditions, condition)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={styles.routines}>
          {(['am', 'pm'] as const).map((slot) => (
            <button key={slot} type="button" className={styles.routine} onClick={openRoutine}>
              <span className={styles.routineHead}>
                <span className={`${styles.dot} ${slot === 'am' ? styles.dotAm : styles.dotPm}`} />
                <Chevron />
              </span>
              <span className={styles.routineTitle}>
                {slot === 'am' ? t('profile.morning') : t('profile.evening')}
              </span>
              <span className={styles.routineMeta}>{stepsText(slot)}</span>
            </button>
          ))}
        </div>

        {lookFor.length > 0 ? (
          <section className={styles.card} aria-labelledby="result-look-for">
            <h3 id="result-look-for" className={styles.cardTitle}>
              {t('profile.lookForTitle')}
            </h3>
            <ul className={styles.chips}>
              {lookFor.map((label) => (
                <li key={label} className={styles.lookChip}>
                  {label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {avoid.length > 0 ? (
          <section className={styles.avoidCard} aria-labelledby="result-avoid">
            <h3 id="result-avoid" className={styles.avoidTitle}>
              {t('profile.avoidTitle')}
            </h3>
            <ul className={styles.chips}>
              {avoid.map((label) => (
                <li key={label} className={styles.avoidChip}>
                  {label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {analysis.restrictions.medicalNotes.length > 0 ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{t('profile.medicalTitle')}</h3>
            <ul className={styles.list}>
              {analysis.restrictions.medicalNotes.map((flag) => (
                <li key={flag}>
                  <strong>{optionLabel(questions, QUESTION_IDS.safetyFlags, flag)}</strong>
                  <p>{messageText(safetyNoteId(flag)) ?? t('common.contentPending')}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasNotes ? (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{t('profile.notesTitle')}</h3>
            <ul className={styles.list}>
              {analysis.contradictions.length > 0 ? (
                <li>{t('profile.contradictionNote')}</li>
              ) : null}
              {analysis.minorMode ? <li>{t('profile.minorNote')}</li> : null}
              {analysis.notes.map((note) => (
                <li key={note}>{t(NOTE_KEYS[note])}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={styles.footnote}>
          <MedicalDisclaimer text={disclaimer.text} />
        </div>
        <Button fullWidth onClick={onConfirm}>
          {t('profile.confirm')}
        </Button>
      </main>

      {details ? (
        <Modal
          title={t('profile.detailsTitle')}
          onClose={() => setDetails(false)}
          actions={
            <Button fullWidth variant="secondary" onClick={() => setDetails(false)}>
              {t('profile.close')}
            </Button>
          }
        >
          <div className={styles.details}>
            <section className={styles.detailsSection}>
              <h3>{t('profile.typeTitle')}</h3>
              <TextBlocks blocks={typeBlocks} content={bundle} />
            </section>
            {conditionBlocks.length > 0 ? (
              <section className={styles.detailsSection}>
                <h3>{t('profile.conditionsTitle')}</h3>
                <TextBlocks blocks={conditionBlocks} content={bundle} />
              </section>
            ) : null}
            <ValueGroup
              title={t('profile.goalsTitle')}
              values={groupValues('goals', profile, questions)}
            />
          </div>
        </Modal>
      ) : null}
    </Background>
  );
}
