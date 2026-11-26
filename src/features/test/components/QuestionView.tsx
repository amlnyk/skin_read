import { useId, type ReactNode } from 'react';
import { t } from '@/i18n';
import { selectedOptionIds, otherTextKey } from '@/logic/test';
import { LIMITS, type TestAnswers } from '@/schemas';
import type { Question } from '@/types';
import { Chip, Field, Sheet } from '@/ui';
import styles from './QuestionView.module.css';

type Props = {
  question: Question;
  answers: TestAnswers;
  onSelect: (optionId: string) => void;
  onOtherText: (optionId: string, text: string) => void;
  onText: (text: string) => void;
  /** The buttons under the options (they live at the end of the sheet, as in Figma). */
  footer: ReactNode;
};

// Draws any question from its data: nothing here depends on a particular question.
// Layout from Figma 01_1_test / 02_2_test: the title over the background, the options on a sheet.
export function QuestionView({ question, answers, onSelect, onOtherText, onText, footer }: Props) {
  const answer = answers[question.id];
  const selected = selectedOptionIds(answer);
  const isMulti = question.type === 'multi';
  const kind = isMulti ? 'checkbox' : 'radio';
  const titleId = useId();

  // A labelled group instead of <fieldset>: legends do not take part in flex layout.
  return (
    <div className={styles.question} role="group" aria-labelledby={titleId}>
      <h1 id={titleId} className={styles.title}>
        {question.text ?? t('common.contentPending')}
      </h1>

      <Sheet scroll>
        <div className={styles.subtitleRow}>
          {question.type === 'text' ? null : (
            <p className={styles.subtitle}>
              {isMulti ? t('test.hintMulti') : t('test.hintSingle')}
            </p>
          )}
          {isMulti && selected.length > 0 ? (
            <p className={styles.count}>{t('test.selectedCount', { count: selected.length })}</p>
          ) : null}
        </div>
        <p className={styles.srOnly}>
          {question.required ? t('test.required') : t('test.optional')}
        </p>
        {question.description ? <p className={styles.description}>{question.description}</p> : null}

        {question.type === 'text' ? (
          <div className={styles.textField}>
            <Field
              label={question.text ?? t('common.contentPending')}
              value={typeof answer === 'string' ? answer : ''}
              maxLength={LIMITS.shortText}
              onChange={onText}
            />
          </div>
        ) : (
          <div className={styles.options}>
            {question.options.map((option) => {
              const isSelected = selected.includes(option.id);
              const text = answers[otherTextKey(question.id, option.id)];
              return (
                <div key={option.id} className={styles.option}>
                  <Chip
                    appearance="row"
                    kind={kind}
                    name={question.id}
                    value={option.id}
                    label={option.label ?? t('common.contentPending')}
                    description={option.description ?? undefined}
                    selected={isSelected}
                    onChange={() => onSelect(option.id)}
                  />
                  {option.hasText && isSelected ? (
                    <div className={styles.other}>
                      <Field
                        label={t('test.otherLabel')}
                        value={typeof text === 'string' ? text : ''}
                        maxLength={LIMITS.otherText}
                        onChange={(value) => onOtherText(option.id, value)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>{footer}</div>
      </Sheet>
    </div>
  );
}
