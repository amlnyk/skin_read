import { useState } from 'react';
import { t } from '@/i18n';
import {
  buildEntry,
  entryHasContent,
  SYMPTOM_KEYS,
  type EntryDraft,
  type JournalFieldVisibility,
  type SymptomKey,
} from '@/logic/journal';
import { LIMITS } from '@/schemas';
import type { Feeling, Intensity, JournalCyclePeriod, JournalEntry, Product } from '@/types';
import { Button, Chip, Field, Select, TextInput } from '@/ui';
import styles from '../pages/JournalPage.module.css';
import { DateField } from './DateField';

const FEELINGS: readonly Feeling[] = ['good', 'so_so', 'bad'];
const LEVELS: readonly Intensity[] = [0, 1, 2, 3];
const CYCLE_PERIODS: readonly JournalCyclePeriod[] = [
  'pre_menstrual',
  'during_menstrual',
  'post_menstrual',
  'other_phase',
  'unknown',
];

/** '' means "not specified". */
function toIntensity(value: string): Intensity | undefined {
  return LEVELS.find((level) => String(level) === value);
}

type Props = {
  /** The day that is chosen first (today). */
  today: string;
  visibility: JournalFieldVisibility;
  products: readonly Product[];
  newId: () => string;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
};

// A new entry. Every field is optional: one filled field is enough to save.
// The optional fields (cycle, shaving) are drawn only when `visibility` says so.
export function EntryForm({ today, visibility, products, newId, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<EntryDraft>({
    date: today,
    symptoms: {},
    newProductIds: [],
    note: '',
  });
  const filled = entryHasContent(draft);

  const intensityOptions = [
    { value: '', label: t('journal.notSpecified') },
    ...LEVELS.map((level) => ({ value: String(level), label: t(`journal.intensity.${level}`) })),
  ];

  const setSymptom = (key: SymptomKey, value: string) =>
    setDraft((current) => {
      const symptoms = { ...current.symptoms };
      const level = toIntensity(value);
      if (level === undefined) delete symptoms[key];
      else symptoms[key] = level;
      return { ...current, symptoms };
    });

  const toggleProduct = (id: string) =>
    setDraft((current) => ({
      ...current,
      newProductIds: current.newProductIds.includes(id)
        ? current.newProductIds.filter((item) => item !== id)
        : [...current.newProductIds, id],
    }));

  const save = () => {
    if (!filled) return;
    onSave(buildEntry(draft, newId(), visibility));
  };

  return (
    <section className={styles.form} aria-labelledby="journal-form-title">
      <h2 id="journal-form-title">{t('journal.formTitle')}</h2>

      <DateField
        label={t('journal.date')}
        value={draft.date}
        max={today}
        onChange={(date) => setDraft((current) => ({ ...current, date }))}
      />

      <Select
        label={t('journal.feeling')}
        value={draft.feeling ?? ''}
        options={[
          { value: '', label: t('journal.notSpecified') },
          ...FEELINGS.map((feeling) => ({
            value: feeling,
            label: t(`journal.feelingOption.${feeling}`),
          })),
        ]}
        onChange={(value) =>
          setDraft((current) => {
            const feeling = FEELINGS.find((item) => item === value);
            const next = { ...current };
            if (feeling === undefined) delete next.feeling;
            else next.feeling = feeling;
            return next;
          })
        }
      />

      <fieldset className={styles.group}>
        <legend>{t('journal.symptomsTitle')}</legend>
        <p className={styles.hint}>{t('journal.symptomsHint')}</p>
        {SYMPTOM_KEYS.map((key) => (
          <Select
            key={key}
            label={t(`journal.symptom.${key}`)}
            value={draft.symptoms[key] === undefined ? '' : String(draft.symptoms[key])}
            options={intensityOptions}
            onChange={(value) => setSymptom(key, value)}
          />
        ))}
        {visibility.shavingIrritation ? (
          <Select
            label={t('journal.shaving')}
            value={draft.shavingIrritation === undefined ? '' : String(draft.shavingIrritation)}
            options={intensityOptions}
            onChange={(value) =>
              setDraft((current) => {
                const next = { ...current };
                const level = toIntensity(value);
                if (level === undefined) delete next.shavingIrritation;
                else next.shavingIrritation = level;
                return next;
              })
            }
          />
        ) : null}
      </fieldset>

      {visibility.cyclePeriod ? (
        <Select
          label={t('journal.cyclePeriod')}
          value={draft.cyclePeriod ?? ''}
          options={[
            { value: '', label: t('journal.notSpecified') },
            ...CYCLE_PERIODS.map((period) => ({
              value: period,
              label: t(`journal.cycleOption.${period}`),
            })),
          ]}
          onChange={(value) =>
            setDraft((current) => {
              const period = CYCLE_PERIODS.find((item) => item === value);
              const next = { ...current };
              if (period === undefined) delete next.cyclePeriod;
              else next.cyclePeriod = period;
              return next;
            })
          }
        />
      ) : null}

      {products.length > 0 ? (
        <fieldset className={styles.group}>
          <legend>{t('journal.newProducts')}</legend>
          {products.map((product) => (
            <Chip
              key={product.id}
              kind="checkbox"
              name="journal-new-products"
              value={product.id}
              label={product.name}
              selected={draft.newProductIds.includes(product.id)}
              onChange={() => toggleProduct(product.id)}
            />
          ))}
        </fieldset>
      ) : null}

      <TextInput
        label={t('journal.routineChange')}
        value={draft.routineChangeNote ?? ''}
        maxLength={LIMITS.otherText}
        hint={t('journal.routineChangeHint')}
        onChange={(routineChangeNote) => setDraft((current) => ({ ...current, routineChangeNote }))}
      />

      <Field
        label={t('journal.note')}
        value={draft.note}
        maxLength={LIMITS.note}
        onChange={(note) => setDraft((current) => ({ ...current, note }))}
      />
      {draft.note.length >= LIMITS.note ? (
        <p role="status" className={styles.hint}>
          {t('journal.noteLimit', { max: LIMITS.note })}
        </p>
      ) : null}

      {filled ? null : <p className={styles.hint}>{t('journal.emptyForm')}</p>}
      <div className={styles.actions}>
        <Button fullWidth disabled={!filled} onClick={save}>
          {t('journal.save')}
        </Button>
        <Button fullWidth variant="secondary" onClick={onCancel}>
          {t('journal.cancel')}
        </Button>
      </div>
    </section>
  );
}
