import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import {
  appendText,
  compositionText,
  confirmPosition,
  ingredientName,
  prepareComposition,
  removePosition,
  replacePosition,
} from '@/logic/analyze';
import { productCategorySchema } from '@/schemas';
import type { ParsedIngredient, Product, ProductCategory } from '@/types';
import { Button, CompositionEditor, Select, TextInput } from '@/ui';
import { useChecks } from '../hooks/useChecks';
import styles from '../scan.module.css';

function textFrom(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const text = (state as { text?: unknown }).text;
  return typeof text === 'string' && text.trim() !== '' ? text : null;
}

// The review of what was understood: chips, possible matches to confirm, the unknown positions
// to fix or delete, and "Перевірити". Nothing is saved until the check is made.
export function ReviewPage() {
  const location = useLocation();
  const text = textFrom(location.state);
  if (text === null) {
    return (
      <section className={styles.page}>
        <h1>{t('scan.reviewTitle')}</h1>
        <p role="status">{t('scan.reviewNoText')}</p>
        <Link to="/scan/paste" className={styles.linkButton}>
          {t('scan.pasteLink')}
        </Link>
      </section>
    );
  }
  return <Review text={text} />;
}

function Review({ text }: { text: string }) {
  const { content, ids, clock } = useServices();
  const navigate = useNavigate();
  const { profile, check } = useChecks();
  const bundle = content.bundle;

  const prepared = useMemo(() => prepareComposition(text, bundle), [text, bundle]);
  const [items, setItems] = useState<ParsedIngredient[]>(prepared.ingredients);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('other');

  const nameOf = (item: ParsedIngredient) =>
    item.ingredientId ? ingredientName(item.ingredientId, bundle.ingredients) : item.raw;

  const run = () => {
    const product: Product = {
      id: `product-${ids.next()}`,
      name: name.trim() === '' ? t('scan.reviewDefaultName') : name.trim(),
      category,
      inciRaw: compositionText(items),
      ingredients: items,
      declaredConcentrations: prepared.declaredConcentrations,
      compositionSource: 'pasted',
      userReactions: [],
      addedAt: new Date(clock.now()).toISOString(),
    };
    const result = check(product);
    if (result) navigate(`/scan/result/${result.id}`);
  };

  return (
    <section className={styles.page}>
      <Link to="/scan/paste" className={styles.back}>
        {t('scan.back')}
      </Link>
      <h1>{t('scan.reviewTitle')}</h1>
      <p className={styles.hint}>{t('scan.reviewIntro')}</p>
      {prepared.warnings.includes('too_long') ? <p role="status">{t('scan.tooLong')}</p> : null}
      {prepared.warnings.includes('multiple_lists_detected') ? (
        <p role="status">{t('scan.multipleLists')}</p>
      ) : null}

      <TextInput
        label={t('scan.reviewNameLabel')}
        value={name}
        maxLength={120}
        onChange={setName}
      />
      <Select
        label={t('scan.reviewCategoryLabel')}
        value={category}
        options={productCategorySchema.options.map((value) => ({
          value,
          label: t(`category.${value}`),
        }))}
        onChange={(value) => {
          const parsed = productCategorySchema.safeParse(value);
          if (parsed.success) setCategory(parsed.data);
        }}
      />

      <CompositionEditor
        items={items}
        nameOf={nameOf}
        onConfirm={(position) => setItems((current) => confirmPosition(current, position))}
        onRemove={(position) => setItems((current) => removePosition(current, position))}
        onFix={(position, fixed) =>
          setItems((current) => replacePosition(current, position, fixed, bundle))
        }
        onAdd={(added) => setItems((current) => appendText(current, added, bundle))}
      />

      {!profile ? (
        <p role="status">
          {t('scan.noProfile')} <Link to="/test">{t('home.startTest')}</Link>
        </p>
      ) : null}
      <Button disabled={!profile || items.length === 0} onClick={run}>
        {t('scan.check')}
      </Button>
    </section>
  );
}
