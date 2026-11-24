import { t } from '@/i18n';
import { selectedOptionIds, otherTextKey } from '@/logic/test';
import { LIMITS, type TestAnswers } from '@/schemas';
import type { Question } from '@/types';
import { Chip, Field } from '@/ui';
import styles from './QuestionView.module.css';

type Props = {
  question: Question;
  answers: TestAnswers;
  onSelect: (optionId: string) => void;
  onOtherText: (optionId: string, text: string) => void;
  onText: (text: string) => void;
};

// Draws any question from its data: nothing here depends on a particular question.
export function QuestionView({ question, answers, onSelect, onOtherText, onText }: Props) {
  const answer = answers[question.id];
  const selected = selectedOptionIds(answer);
  const kind = question.type === 'multi' ? 'checkbox' : 'radio';

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        <h1>{question.text ?? t('common.contentPending')}</h1>
      </legend>
      {question.description ? <p className={styles.description}>{question.description}</p> : null}
      <p className={styles.hint}>{question.required ? t('test.required') : t('test.optional')}</p>

      {question.type === 'text' ? (
        <Field
          label={question.text ?? t('common.contentPending')}
          value={typeof answer === 'string' ? answer : ''}
          maxLength={LIMITS.shortText}
          onChange={onText}
        />
      ) : (
        <div className={styles.options}>
          {question.options.map((option) => {
            const isSelected = selected.includes(option.id);
            const text = answers[otherTextKey(question.id, option.id)];
            return (
              <div key={option.id} className={styles.option}>
                <Chip
                  kind={kind}
                  name={question.id}
                  value={option.id}
                  label={option.label ?? t('common.contentPending')}
                  description={option.description ?? undefined}
                  selected={isSelected}
                  onChange={() => onSelect(option.id)}
                />
                {option.hasText && isSelected ? (
                  <Field
                    label={t('test.otherLabel')}
                    value={typeof text === 'string' ? text : ''}
                    maxLength={LIMITS.otherText}
                    onChange={(value) => onOtherText(option.id, value)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
