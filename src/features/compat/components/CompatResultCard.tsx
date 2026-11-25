import { t } from '@/i18n';
import type { CompatResult } from '@/logic/compat';
import { noteLabel, subjectName, unknownNames, type CompatLabelContent } from '../utils/labels';
import { StatusIcon } from './StatusIcon';
import styles from './CompatResultCard.module.css';

type Props = {
  result: CompatResult;
  content: CompatLabelContent;
};

const hasText = (value: string | null): value is string => value !== null && value.trim() !== '';

function reasonText(result: CompatResult, content: CompatLabelContent): string {
  if (result.reason === 'unknown_subject') {
    return t('compat.reason.unknown_subject', {
      names: unknownNames(result.unknownSubjects, content),
    });
  }
  return t(`compat.reason.${result.reason}`);
}

// The result for one pair. The status is an icon plus words, and the card says what the
// verdict rests on: a rule (with its source and review status) or only "nothing known".
export function CompatResultCard({ result, content }: Props) {
  const title = t('compat.pairTitle', {
    a: subjectName(result.a, content),
    b: subjectName(result.b, content),
  });
  const hasRule = result.ruleId !== null;

  return (
    <article className={styles.card} aria-label={title}>
      <h3>{title}</h3>

      <div
        className={styles.status}
        role="group"
        aria-label={t(`compat.status.${result.status}.title`)}
      >
        <StatusIcon status={result.status} />
        <div>
          <p className={styles.statusTitle}>{t(`compat.status.${result.status}.title`)}</p>
          <p>{t(`compat.status.${result.status}.text`)}</p>
        </div>
      </div>

      <p>{reasonText(result, content)}</p>

      {result.conditionNotes.length > 0 ? (
        <div>
          <p className={styles.label}>{t('compat.conditionsLabel')}</p>
          <ul>
            {result.conditionNotes.map((note) => (
              <li key={`${note.kind}-${note.value}`}>{noteLabel(note, content)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasRule ? (
        <dl className={styles.facts}>
          <div>
            <dt>{t('compat.explanationLabel')}</dt>
            <dd>{hasText(result.explanation) ? result.explanation : t('compat.textPending')}</dd>
          </div>
          <div>
            <dt>{t('compat.timingLabel')}</dt>
            <dd>{hasText(result.timingAdvice) ? result.timingAdvice : t('compat.textPending')}</dd>
          </div>
          {result.source ? (
            <div>
              <dt>{t('compat.sourceLabel')}</dt>
              <dd>{result.source}</dd>
            </div>
          ) : null}
          {result.reviewStatus ? (
            <div>
              <dt>{t('compat.reviewLabel')}</dt>
              <dd>{t(`compat.reviewStatus.${result.reviewStatus}`)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </article>
  );
}
