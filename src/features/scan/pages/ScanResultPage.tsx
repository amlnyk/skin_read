import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { disclaimer } from '@/content';
import { t } from '@/i18n';
import { usePhoto, useServices } from '@/lib/services';
import { ingredientName } from '@/logic/analyze';
import { attachProduct, canAttach } from '@/logic/routine';
import { frequencySchema, slotSchema } from '@/schemas';
import { useAppStore, useAppStoreApi } from '@/store';
import type { Frequency, ParsedIngredient, Product, ScanResult, Slot } from '@/types';
import { Button, MedicalDisclaimer, Modal, PhotoPreview, Select } from '@/ui';
import { IngredientSheet } from '../components/IngredientSheet';
import { ObservationList } from '../components/ObservationList';
import { ScanStatusIcon } from '../components/ScanStatusIcon';
import type { DescribeContext } from '../utils/describe';
import { useChecks } from '../hooks/useChecks';
import { goalLabel, namesOf } from '../utils/labels';
import styles from '../styles/scan.module.css';

export function ScanResultPage() {
  const { id } = useParams();
  const scan = useAppStore((state) => state.scans.find((entry) => entry.id === id));
  if (!scan) {
    return (
      <section className={styles.page}>
        <p role="status">{t('scan.notFound')}</p>
        <Link to="/scan" className={styles.back}>
          {t('scan.back')}
        </Link>
      </section>
    );
  }
  return <ResultView scan={scan} />;
}

// The result of one check: the status in words and with an icon, what was found and why,
// what is missing, and what to do next. The screen only shows what the logic returned.
function ResultView({ scan }: { scan: ScanResult }) {
  const { content } = useServices();
  const bundle = content.bundle;
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const products = useAppStore((state) => state.products);
  const { check } = useChecks();
  const [routineOpen, setRoutineOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openIngredient, setOpenIngredient] = useState<string | null>(null);

  const context: DescribeContext = { content: bundle, profile, products };
  const of = (...kinds: string[]) =>
    scan.warnings.filter((warning) => kinds.includes(warning.kind));

  const old = profile !== null && scan.profileRevision !== profile.revision;
  const product = scan.productSnapshot;
  const photo = usePhoto(product.id);

  const recheck = () => {
    const result = check(product);
    if (result) navigate(`/scan/result/${result.id}`);
  };

  // The whole recognised composition, in label order, each component once.
  const keyComponents = [
    ...new Map(
      scan.matched
        .filter((item) => item.confirmed && item.ingredientId !== null)
        .map((item) => [item.ingredientId as string, item] as const),
    ).values(),
  ];
  // Components named in the personal warnings are marked in the list.
  const personalIds = new Set(
    of('personal_restriction', 'doctor_note', 'ingredient_caution', 'preference_mismatch').flatMap(
      (warning) => warning.ingredientIds,
    ),
  );
  const openCard = bundle.ingredients.find((entry) => entry.id === openIngredient) ?? null;
  const possible = scan.matched.filter((item) => !item.confirmed);

  return (
    <section className={styles.page}>
      <Link to="/scan" className={styles.back}>
        {t('scan.back')}
      </Link>
      <h1>{product.name}</h1>
      <p className={styles.hint}>{t(`category.${product.category}`)}</p>
      {photo.url ? (
        <PhotoPreview
          src={photo.url}
          alt={t('photo.alt')}
          removeLabel={t('photo.remove')}
          onRemove={() => void photo.remove()}
        />
      ) : null}

      {old ? (
        <div className={styles.banner} role="status">
          <p>
            <strong>{t('scan.oldBannerTitle')}</strong>
          </p>
          <p>{t('scan.oldBannerText')}</p>
          <Button variant="secondary" onClick={recheck}>
            {t('scan.recheck')}
          </Button>
        </div>
      ) : null}

      <div
        className={styles.status}
        role="group"
        aria-label={t(`scan.status.${scan.status}.title`)}
      >
        <ScanStatusIcon status={scan.status} />
        <div>
          <p className={styles.statusTitle}>{t(`scan.status.${scan.status}.title`)}</p>
          <p>{t(`scan.status.${scan.status}.text`)}</p>
        </div>
      </div>

      <ObservationList
        title={t('scan.personalTitle')}
        observations={of('personal_restriction', 'doctor_note', 'ingredient_caution')}
        context={context}
      />
      <ObservationList
        title={t('scan.conflictsTitle')}
        observations={of('conflict')}
        context={context}
      />
      <ObservationList
        title={t('scan.duplicatesTitle')}
        observations={of('duplicate_active')}
        context={context}
      />
      <ObservationList
        title={t('scan.wishTitle')}
        observations={of('preference_mismatch')}
        context={context}
      />

      {scan.benefits.length > 0 ? (
        <section className={styles.section} aria-label={t('scan.benefitsTitle')}>
          <h2>{t('scan.benefitsTitle')}</h2>
          <p className={styles.hint}>{t('scan.benefitsHint')}</p>
          <ul>
            {scan.benefits.map((benefit) => (
              <li key={`${benefit.ingredientId}-${benefit.goal}`}>
                {t('scan.benefitLine', {
                  name: ingredientName(benefit.ingredientId, bundle.ingredients),
                  goal: goalLabel(bundle, benefit.goal),
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section} aria-label={t('scan.keyTitle')}>
        <h2>{t('scan.keyTitle')}</h2>
        {keyComponents.length === 0 ? (
          <p>{t('scan.keyEmpty')}</p>
        ) : (
          <p className={styles.hint}>{t('scan.keyHint')}</p>
        )}
        <ul className={styles.composition}>
          {keyComponents.map((item) => {
            const id = item.ingredientId as string;
            const personal = personalIds.has(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className={personal ? `${styles.component} ${styles.personal}` : styles.component}
                  onClick={() => setOpenIngredient(id)}
                  aria-describedby={personal ? 'scan-personal-note' : undefined}
                >
                  {ingredientName(id, bundle.ingredients)}
                </button>
              </li>
            );
          })}
        </ul>
        {personalIds.size > 0 ? (
          <p id="scan-personal-note" className={styles.personalNote}>
            <span className={styles.personalDot} aria-hidden="true" />
            {t('scan.keyPersonal')}
          </p>
        ) : null}
      </section>

      {possible.length > 0 ? (
        <section className={styles.section} aria-label={t('scan.possibleTitle')}>
          <h2>{t('scan.possibleTitle')}</h2>
          <ul>
            {possible.map((item) => (
              <li key={item.position}>
                {t('scan.possibleLine', {
                  raw: item.raw,
                  name: item.ingredientId ? namesOf([item.ingredientId], bundle) : item.raw,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {scan.unknown.length > 0 ? (
        <section className={styles.section} aria-label={t('scan.unknownTitle')}>
          <h2>{t('scan.unknownTitle')}</h2>
          <p>{t('scan.unknownCount', { count: scan.unknown.length })}</p>
          <ul>
            {scan.unknown.map((raw, index) => (
              <li key={`${index}-${raw}`}>{raw}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section} aria-label={t('scan.missingTitle')}>
        <h2>{t('scan.missingTitle')}</h2>
        <ul>
          {scan.insufficientInfo.map((entry) => (
            <li key={entry.id}>{limitText(entry.key)}</li>
          ))}
        </ul>
      </section>

      {product.ingredients.length > 0 ? (
        <details className={styles.details}>
          <summary>{t('scan.fullTitle')}</summary>
          <ol>
            {product.ingredients.map((item) => (
              <li key={item.position}>
                {t('scan.fullLine', {
                  position: item.position,
                  raw: item.raw,
                  how: t(`scan.how.${howKey(item.matchType, item.confirmed)}`),
                })}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <MedicalDisclaimer text={disclaimer.text} />

      <section className={styles.actions} aria-label={t('scan.actionsTitle')}>
        <h2>{t('scan.actionsTitle')}</h2>
        {saved ? <p role="status">{t('scan.saved')}</p> : null}
        <Button onClick={() => setRoutineOpen(true)} disabled={product.ingredients.length === 0}>
          {t('scan.addToRoutine')}
        </Button>
        <SaveButton product={product} onSaved={() => setSaved(true)} />
        <Button variant="secondary" onClick={() => navigate('/scan/paste')}>
          {t('scan.checkAnother')}
        </Button>
        <Button variant="text" onClick={() => navigate('/scan')}>
          {t('scan.decline')}
        </Button>
      </section>

      {routineOpen ? (
        <RoutineModal product={product} onClose={() => setRoutineOpen(false)} />
      ) : null}
      {openIngredient ? (
        <IngredientSheet
          ingredient={openCard}
          fallbackName={ingredientName(openIngredient, bundle.ingredients)}
          onClose={() => setOpenIngredient(null)}
        />
      ) : null}
    </section>
  );
}

function howKey(matchType: ParsedIngredient['matchType'], confirmed: boolean) {
  if (matchType === 'fuzzy') return confirmed ? 'fuzzyConfirmed' : 'fuzzy';
  return matchType;
}

function limitText(key: string | null): string {
  switch (key) {
    case 'no_composition':
      return t('scan.limit.no_composition');
    case 'low_coverage':
      return t('scan.limit.low_coverage');
    case 'unrecognized_items':
      return t('scan.limit.unrecognized_items');
    case 'possible_matches':
      return t('scan.limit.possible_matches');
    case 'concentrations_unknown':
      return t('scan.limit.concentrations_unknown');
    case 'concentrations_declared':
      return t('scan.limit.concentrations_declared');
    default:
      return t('scan.limit.no_guarantee');
  }
}

/** Puts the product into the collection (if it is not there yet). */
function useSaveProduct() {
  const store = useAppStoreApi();
  return (product: Product, patch: Partial<Product> = {}) => {
    const { actions, products } = store.getState();
    if (products.some((entry) => entry.id === product.id)) {
      if (Object.keys(patch).length > 0) actions.products.update(product.id, patch);
    } else {
      actions.products.add({ ...product, ...patch });
    }
  };
}

function SaveButton({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const save = useSaveProduct();
  return (
    <Button
      variant="secondary"
      onClick={() => {
        save(product);
        onSaved();
      }}
    >
      {t('scan.saveForLater')}
    </Button>
  );
}

function RoutineModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { ids } = useServices();
  const store = useAppStoreApi();
  const save = useSaveProduct();
  const [slot, setSlot] = useState<Slot>('pm');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [message, setMessage] = useState<'done' | 'cannot' | 'none' | null>(null);

  const add = () => {
    const { routine, actions } = store.getState();
    const target = routine.find((entry) => entry.slot === slot);
    if (!target) {
      setMessage('none');
      return;
    }
    if (!canAttach(target, product)) {
      setMessage('cannot');
      return;
    }
    save(product, { slot, frequency });
    actions.routine.update(target.id, {
      steps: attachProduct(target, product, `user-${ids.next()}`, frequency).steps,
    });
    setMessage('done');
  };

  return (
    <Modal
      title={t('scan.routineTitle')}
      onClose={onClose}
      actions={
        <>
          <Button onClick={add} disabled={message === 'done'}>
            {t('scan.routineAdd')}
          </Button>
          <Button variant="text" onClick={onClose}>
            {t('products.cancel')}
          </Button>
        </>
      }
    >
      <Select
        label={t('scan.routineSlot')}
        value={slot}
        options={slotSchema.options.map((value) => ({
          value,
          label: value === 'am' ? t('products.slotAm') : t('products.slotPm'),
        }))}
        onChange={(value) => {
          const parsed = slotSchema.safeParse(value);
          if (parsed.success) setSlot(parsed.data);
        }}
      />
      <Select
        label={t('scan.routineFrequency')}
        value={frequency}
        options={frequencySchema.options.map((value) => ({
          value,
          label: t(`frequency.${value}`),
        }))}
        onChange={(value) => {
          const parsed = frequencySchema.safeParse(value);
          if (parsed.success) setFrequency(parsed.data);
        }}
      />
      {message === 'done' ? <p role="status">{t('scan.routineAdded')}</p> : null}
      {message === 'cannot' ? <p role="status">{t('scan.routineCannot')}</p> : null}
      {message === 'none' ? <p role="status">{t('scan.routineNoProfile')}</p> : null}
    </Modal>
  );
}
