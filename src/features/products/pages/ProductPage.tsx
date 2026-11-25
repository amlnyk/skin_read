import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { compositionText, ingredientName, markReaction, needsComposition } from '@/logic/analyze';
import { useAppStore, useAppStoreApi } from '@/store';
import type { DeclaredConcentration, ParsedIngredient, Product } from '@/types';
import { Button, Chip, Modal } from '@/ui';
import { CompositionBuilder } from '../components/CompositionBuilder';
import styles from '../products.module.css';

export function ProductPage() {
  const { id } = useParams();
  const product = useAppStore((state) => state.products.find((entry) => entry.id === id));
  if (!product) {
    return (
      <section className={styles.page}>
        <Link to="/care/products" className={styles.back}>
          {t('products.title')}
        </Link>
        <p role="status">{t('products.notFound')}</p>
      </section>
    );
  }
  return <Card product={product} />;
}

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('uk-UA');

// The card of a product: what is known about it (and what is not), the reaction button, and
// the way to check it. Nothing is invented: with no composition the card says so.
function Card({ product }: { product: Product }) {
  const { content, clock } = useServices();
  const store = useAppStoreApi();
  const profile = useAppStore((state) => state.profile);
  const bundle = content.bundle;
  const [marking, setMarking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [draft, setDraft] = useState<ParsedIngredient[]>([]);
  const [declared, setDeclared] = useState<DeclaredConcentration[]>([]);

  const name = (id: string) => ingredientName(id, bundle.ingredients);
  const missing = needsComposition(product);

  const suspects = [
    ...new Set(
      product.ingredients
        .filter(
          (item) => item.ingredientId !== null && item.confirmed && item.matchType !== 'unknown',
        )
        .map((item) => item.ingredientId as string),
    ),
  ];

  const saveReaction = () => {
    if (!profile) return;
    const { actions, careSetup } = store.getState();
    const result = markReaction(profile, product, chosen, new Date(clock.now()).toISOString());
    actions.profile.set(result.profile);
    actions.products.update(product.id, { userReactions: result.product.userReactions });
    // the routine was built for the old profile: marking an ingredient does not make it stale
    if (
      careSetup.builtForRevision === profile.revision &&
      result.profile.revision !== profile.revision
    ) {
      actions.careSetup.update({ builtForRevision: result.profile.revision });
    }
    setMarking(false);
    setChosen([]);
    setDone(true);
  };

  const saveComposition = () => {
    if (draft.length === 0) return;
    store.getState().actions.products.update(product.id, {
      inciRaw: compositionText(draft),
      ingredients: draft,
      compositionSource: 'pasted',
      ...(declared.length > 0 ? { declaredConcentrations: declared } : {}),
    });
  };

  return (
    <section className={styles.page}>
      <Link to="/care/products" className={styles.back}>
        {t('products.title')}
      </Link>
      <h1>{product.name}</h1>
      {product.brand ? <p>{product.brand}</p> : null}
      <p className={styles.hint}>{t(`category.${product.category}`)}</p>
      {missing ? <p className={styles.tag}>{t('products.needsComposition')}</p> : null}

      <dl>
        <dt>{t('products.sourceLabel')}</dt>
        <dd>{t(`products.source.${product.compositionSource}`)}</dd>
        <dt>{t('products.addedLabel')}</dt>
        <dd>{dateOf(product.addedAt)}</dd>
        {product.slot ? (
          <>
            <dt>{t('products.slotLabel')}</dt>
            <dd>{product.slot === 'am' ? t('products.slotAm') : t('products.slotPm')}</dd>
          </>
        ) : null}
        {product.frequency ? (
          <>
            <dt>{t('products.frequencyLabel')}</dt>
            <dd>{t(`frequency.${product.frequency}`)}</dd>
          </>
        ) : null}
      </dl>

      <section className={styles.section} aria-label={t('products.compositionTitle')}>
        <h2>{t('products.compositionTitle')}</h2>
        {missing ? (
          <>
            <p>{t('products.compositionUnknown')}</p>
            <h3>{t('products.addComposition')}</h3>
            <CompositionBuilder
              mode="paste"
              content={bundle}
              items={draft}
              onChange={(next, concentrations) => {
                setDraft(next);
                if (concentrations) setDeclared(concentrations);
              }}
            />
            <Button variant="secondary" disabled={draft.length === 0} onClick={saveComposition}>
              {t('products.save')}
            </Button>
          </>
        ) : (
          <>
            <ol>
              {product.ingredients.map((item) => (
                <li key={item.position}>
                  {item.ingredientId ? name(item.ingredientId) : item.raw}
                  {item.matchType === 'unknown' ? ` (${t('scan.how.unknown')})` : ''}
                  {item.matchType === 'fuzzy' && !item.confirmed ? ` (${t('scan.how.fuzzy')})` : ''}
                </li>
              ))}
            </ol>
            <p className={styles.hint}>
              {(product.declaredConcentrations ?? []).length > 0
                ? t('products.concentrationsDeclared', {
                    list: (product.declaredConcentrations ?? [])
                      .map((entry) => entry.raw)
                      .join(', '),
                  })
                : t('products.concentrationsUnknown')}
            </p>
          </>
        )}
      </section>

      {product.userReactions.length > 0 ? (
        <section className={styles.section} aria-label={t('products.reactionsTitle')}>
          <h2>{t('products.reactionsTitle')}</h2>
          <ul>
            {product.userReactions.map((reaction, index) => (
              <li key={`${index}-${reaction.at}`}>
                {t('products.reactionEntry', {
                  date: dateOf(reaction.at),
                  names: reaction.note
                    .split(', ')
                    .filter((part) => part !== '')
                    .map(name)
                    .join(', '),
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {done ? <p role="status">{t('products.reactionDone')}</p> : null}

      <div className={styles.actions}>
        {!missing ? (
          <Link to={`/scan/check/${product.id}`} className={styles.linkButton}>
            {t('products.check')}
          </Link>
        ) : null}
        <Button variant="secondary" disabled={!profile || missing} onClick={() => setMarking(true)}>
          {t('products.reactionButton')}
        </Button>
      </div>

      {marking ? (
        <Modal
          title={t('products.reactionTitle')}
          onClose={() => setMarking(false)}
          actions={
            <>
              <Button disabled={chosen.length === 0} onClick={saveReaction}>
                {t('products.reactionSave')}
              </Button>
              <Button variant="text" onClick={() => setMarking(false)}>
                {t('products.cancel')}
              </Button>
            </>
          }
        >
          <p className={styles.hint}>{t('products.reactionHint')}</p>
          {suspects.length === 0 ? <p>{t('products.reactionNone')}</p> : null}
          {suspects.map((id) => (
            <Chip
              key={id}
              kind="checkbox"
              name="suspect"
              value={id}
              label={name(id)}
              selected={chosen.includes(id)}
              onChange={() =>
                setChosen((current) =>
                  current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
                )
              }
            />
          ))}
        </Modal>
      ) : null}
    </section>
  );
}
