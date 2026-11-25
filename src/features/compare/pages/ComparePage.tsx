import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { groupName, ingredientName } from '@/logic/analyze';
import { compareProducts, MAX_CURRENCY_LENGTH } from '@/logic/compare';
import { Select, TextInput } from '@/ui';
import { useAppStore } from '@/store';
import { ProductColumn } from '../components/ProductColumn';
import styles from '../styles/compare.module.css';
import { parsePrice } from '../utils/parsePrice';
import { useCompareSources, useProfileAnalysis } from '../hooks/useCompareSources';

const NONE = '';

// «Порівняти засоби»: two products side by side. Only the composition is compared. The prices
// are what the user typed, and without both of them there is no price line at all.
export function ComparePage() {
  const { content, clock } = useServices();
  const sources = useCompareSources();
  const { profile, analysis } = useProfileAnalysis();
  const routines = useAppStore((state) => state.routine);
  const products = useAppStore((state) => state.products);

  const [keyA, setKeyA] = useState(NONE);
  const [keyB, setKeyB] = useState(NONE);
  const [priceA, setPriceA] = useState('');
  const [priceB, setPriceB] = useState('');
  const [currency, setCurrency] = useState('');

  const options = [
    { value: NONE, label: t('compare.choose') },
    ...sources.map((source) => ({
      value: source.key,
      label: source.fromHistory
        ? t('compare.fromHistory', { name: source.product.name })
        : source.product.name,
    })),
  ];
  const a = sources.find((source) => source.key === keyA);
  const b = sources.find((source) => source.key === keyB);
  const sameChosen = a !== undefined && b !== undefined && a.product.id === b.product.id;

  const priceTyped = priceA.trim() !== '' || priceB.trim() !== '' || currency.trim() !== '';

  const result = useMemo(() => {
    if (!profile || !analysis || !a || !b || sameChosen) return null;
    return compareProducts({
      a: a.product,
      b: b.product,
      prices: { a: parsePrice(priceA), b: parsePrice(priceB), currency },
      idA: 'compare-a',
      idB: 'compare-b',
      profile,
      analysis,
      routines,
      products,
      content: content.bundle,
      now: clock.now(),
    });
  }, [
    profile,
    analysis,
    a,
    b,
    sameChosen,
    priceA,
    priceB,
    currency,
    routines,
    products,
    content,
    clock,
  ]);

  const bundle = content.bundle;
  const difference = result?.priceDifference;
  const cheaperName =
    difference && difference.cheaper !== 'equal' && a && b
      ? difference.cheaper === 'a'
        ? a.product.name
        : b.product.name
      : null;
  const inCollection = (source: typeof a) => source !== undefined && !source.fromHistory;

  return (
    <section className={styles.page}>
      <Link to="/care" className={styles.back}>
        {t('compare.back')}
      </Link>
      <h1>{t('compare.title')}</h1>
      <p>{t('compare.intro')}</p>

      {!profile ? (
        <p role="status">
          {t('compare.noProfile')} <Link to="/test">{t('home.startTest')}</Link>
        </p>
      ) : null}

      {sources.length === 0 ? (
        <>
          <p>{t('compare.sourcesEmpty')}</p>
          <Link to="/care/products/new" className={styles.linkButton}>
            {t('compare.addProduct')}
          </Link>
        </>
      ) : (
        <>
          <Select
            label={t('compare.firstLabel')}
            value={keyA}
            options={options}
            onChange={setKeyA}
          />
          <Select
            label={t('compare.secondLabel')}
            value={keyB}
            options={options}
            onChange={setKeyB}
          />
          {sameChosen ? <p role="status">{t('compare.sameChosen')}</p> : null}

          <fieldset className={styles.prices}>
            <legend>{t('compare.pricesTitle')}</legend>
            <p className={styles.hint}>{t('compare.pricesHint')}</p>
            <TextInput
              label={t('compare.priceA')}
              value={priceA}
              onChange={setPriceA}
              maxLength={10}
            />
            <TextInput
              label={t('compare.priceB')}
              value={priceB}
              onChange={setPriceB}
              maxLength={10}
            />
            <TextInput
              label={t('compare.currency')}
              value={currency}
              onChange={setCurrency}
              maxLength={MAX_CURRENCY_LENGTH}
            />
          </fieldset>
        </>
      )}

      {result && a && b ? (
        <section aria-labelledby="compare-result" className={styles.result}>
          <h2 id="compare-result">{t('compare.resultTitle')}</h2>

          <div className={styles.columns}>
            <ProductColumn
              product={a.product}
              result={result.a}
              onlyGroupIds={result.onlyAGroupIds}
              onlyIngredientIds={result.onlyAIngredientIds}
              content={bundle}
              inCollection={inCollection(a)}
            />
            <ProductColumn
              product={b.product}
              result={result.b}
              onlyGroupIds={result.onlyBGroupIds}
              onlyIngredientIds={result.onlyBIngredientIds}
              content={bundle}
              inCollection={inCollection(b)}
            />
          </div>

          <p>{result.sameCategory ? t('compare.sameCategory') : t('compare.otherCategory')}</p>
          <p>
            <strong>{`${t('compare.sharedGroups')}: `}</strong>
            {result.sharedGroupIds.length === 0
              ? t('compare.nothing')
              : result.sharedGroupIds
                  .map((id) => groupName(id, bundle.ingredientGroups) ?? t('scan.pending'))
                  .join(', ')}
          </p>
          {result.sharedActiveGroupIds.length > 0 ? (
            <p>
              <strong>{`${t('compare.sharedActive')}: `}</strong>
              {result.sharedActiveGroupIds
                .map((id) => groupName(id, bundle.ingredientGroups) ?? t('scan.pending'))
                .join(', ')}
            </p>
          ) : null}
          <p>
            <strong>{`${t('compare.sharedIngredients')}: `}</strong>
            {result.sharedIngredientIds.length === 0
              ? t('compare.nothing')
              : result.sharedIngredientIds
                  .map((id) => ingredientName(id, bundle.ingredients))
                  .join(', ')}
          </p>

          {difference ? (
            <p>
              {difference.cheaper === 'equal' || cheaperName === null
                ? t('compare.priceEqual', {
                    amount: difference.amount,
                    currency: difference.currency,
                  })
                : t('compare.priceDifference', {
                    amount: difference.amount,
                    currency: difference.currency,
                    name: cheaperName,
                  })}
            </p>
          ) : priceTyped ? (
            <p className={styles.hint}>{t('compare.priceNeedBoth')}</p>
          ) : null}

          <h3>{t('compare.verdictTitle')}</h3>
          <p>{t(`compare.verdict.${result.similarity}`)}</p>
          <p className={styles.caption}>{t('compare.caption')}</p>
        </section>
      ) : null}
    </section>
  );
}
