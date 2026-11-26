import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { checkList, type CompatContext, type CompatSubject } from '@/logic/compat';
import type { Slot } from '@/schemas';
import { useAppStore } from '@/store';
import { Chip } from '@/ui';
import { CompatResultCard } from '../components/CompatResultCard';
import { IngredientPicker } from '../components/IngredientPicker';
import { subjectName } from '../utils/labels';
import styles from './CompatCheckerPage.module.css';

/** How many components can be checked at once (15 pairs at 6 components, 28 at 8). */
const MAX_SUBJECTS = 8;

type SlotChoice = '' | Slot;

const SLOT_CHOICES: readonly {
  value: SlotChoice;
  labelKey: 'compat.slotAny' | 'compat.slotAm' | 'compat.slotPm';
}[] = [
  { value: '', labelKey: 'compat.slotAny' },
  { value: 'am', labelKey: 'compat.slotAm' },
  { value: 'pm', labelKey: 'compat.slotPm' },
];

const same = (a: CompatSubject, b: CompatSubject) => a.kind === b.kind && a.id === b.id;

// "Довідник → Перевірка сумісності". The user picks two or more components or groups; the
// logic checks every pair against the rules in the content. The screen only shows the
// results: it never decides anything itself.
export function CompatCheckerPage() {
  const { content } = useServices();
  const bundle = content.bundle;
  const profile = useAppStore((state) => state.profile);

  const [selected, setSelected] = useState<CompatSubject[]>([]);
  const [slot, setSlot] = useState<SlotChoice>('');

  const toggle = (subject: CompatSubject) =>
    setSelected((current) =>
      current.some((entry) => same(entry, subject))
        ? current.filter((entry) => !same(entry, subject))
        : [...current, subject],
    );

  const results = useMemo(() => {
    const ctx: CompatContext = {
      slot: slot === '' ? null : slot,
      profile: profile ? { conditions: profile.conditions, reactions: profile.reactions } : null,
    };
    return checkList(selected, ctx, bundle);
  }, [selected, slot, profile, bundle]);

  const hasContent = bundle.ingredients.length + bundle.ingredientGroups.length > 0;

  return (
    <section className={styles.page}>
      <Link to="/scan" className={styles.back}>
        {t('compat.back')}
      </Link>
      <h1>{t('compat.title')}</h1>
      <p className={styles.hint}>{t('compat.intro')}</p>

      {!hasContent ? (
        <p role="status">{t('compat.noContent')}</p>
      ) : (
        <>
          <IngredientPicker
            content={bundle}
            selected={selected}
            onToggle={toggle}
            max={MAX_SUBJECTS}
          />

          <section className={styles.section} aria-labelledby="compat-selected">
            <h2 id="compat-selected">{t('compat.selectedTitle')}</h2>
            {selected.length === 0 ? (
              <p className={styles.hint}>{t('compat.selectedEmpty')}</p>
            ) : (
              <ul className={styles.selected}>
                {selected.map((subject) => {
                  const name = subjectName(subject, bundle);
                  return (
                    <li key={`${subject.kind}-${subject.id}`}>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={t('compat.remove', { name })}
                        onClick={() => toggle(subject)}
                      >
                        <span>{name}</span>
                        <span aria-hidden="true">{'\u00d7'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <fieldset className={styles.slot}>
            <legend>{t('compat.slotLabel')}</legend>
            <p className={styles.hint}>{t('compat.slotHint')}</p>
            <div className={styles.slotChoices}>
              {SLOT_CHOICES.map((choice) => (
                <Chip
                  key={choice.value || 'any'}
                  kind="radio"
                  name="compat-slot"
                  value={choice.value}
                  label={t(choice.labelKey)}
                  selected={slot === choice.value}
                  onChange={() => setSlot(choice.value)}
                />
              ))}
            </div>
          </fieldset>

          <p className={styles.hint}>
            {profile ? t('compat.profileUsed') : t('compat.profileNone')}
          </p>

          <section className={styles.section} aria-labelledby="compat-results">
            <h2 id="compat-results">{t('compat.resultsTitle')}</h2>
            {selected.length < 2 ? (
              <p role="status" className={styles.hint}>
                {t('compat.needMore')}
              </p>
            ) : (
              results.map((result) => (
                <CompatResultCard
                  key={`${result.a.kind}-${result.a.id}-${result.b.kind}-${result.b.id}`}
                  result={result}
                  content={bundle}
                />
              ))
            )}
          </section>
        </>
      )}
    </section>
  );
}
