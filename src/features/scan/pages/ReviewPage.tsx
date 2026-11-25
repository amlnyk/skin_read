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
import { Button, Chip, CompositionEditor, Select, TextInput } from '@/ui';
import { useChecks } from '../hooks/useChecks';
import styles from '../styles/scan.module.css';

// Below this the photo is called unclear on the review screen. It is a prompt to look closer,
// not a verdict: the service judges how legible the list was.
const LOW_CONFIDENCE = 0.6;

type ReviewInput = {
  text: string;
  source: 'photo' | 'pasted';
  name: string;
  brand: string;
  category: ProductCategory;
  confidence: number | null;
  photo: Blob | null;
};

const stringOr = (value: unknown): string => (typeof value === 'string' ? value : '');

// What the previous screen passed on (a pasted text, or the reading of a photo). Anything
// unexpected is ignored: the state of a route is not trusted.
function inputFrom(state: unknown): ReviewInput | null {
  if (typeof state !== 'object' || state === null) return null;
  const given = state as Record<string, unknown>;
  const text = given['text'];
  if (typeof text !== 'string' || text.trim() === '') return null;
  const fromPhoto = given['source'] === 'photo';
  const guess = productCategorySchema.safeParse(given['categoryGuess']);
  const confidence = given['confidence'];
  return {
    text,
    source: fromPhoto ? 'photo' : 'pasted',
    name: fromPhoto ? stringOr(given['name']).slice(0, 120) : '',
    brand: fromPhoto ? stringOr(given['brand']).slice(0, 120) : '',
    category: fromPhoto && guess.success ? guess.data : 'other',
    confidence: fromPhoto && typeof confidence === 'number' ? confidence : null,
    photo: fromPhoto && given['photo'] instanceof Blob ? given['photo'] : null,
  };
}

// The review of what was understood: chips, possible matches to confirm, the unknown positions
// to fix or delete, and "Перевірити". Nothing is saved until the check is made.
export function ReviewPage() {
  const location = useLocation();
  const input = inputFrom(location.state);
  if (input === null) {
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
  return <Review input={input} />;
}

function Review({ input }: { input: ReviewInput }) {
  const { text } = input;
  const { content, ids, clock, photos } = useServices();
  const navigate = useNavigate();
  const { profile, check } = useChecks();
  const bundle = content.bundle;

  const prepared = useMemo(() => prepareComposition(text, bundle), [text, bundle]);
  const [items, setItems] = useState<ParsedIngredient[]>(prepared.ingredients);
  const [name, setName] = useState(input.name);
  const [brand, setBrand] = useState(input.brand);
  const [category, setCategory] = useState<ProductCategory>(input.category);
  const [keepPhoto, setKeepPhoto] = useState(false);

  const nameOf = (item: ParsedIngredient) =>
    item.ingredientId ? ingredientName(item.ingredientId, bundle.ingredients) : item.raw;

  const run = async () => {
    const product: Product = {
      id: `product-${ids.next()}`,
      name: name.trim() === '' ? t('scan.reviewDefaultName') : name.trim(),
      ...(brand.trim() !== '' ? { brand: brand.trim() } : {}),
      category,
      inciRaw: compositionText(items),
      ingredients: items,
      declaredConcentrations: prepared.declaredConcentrations,
      compositionSource: input.source === 'photo' ? 'photo' : 'pasted',
      userReactions: [],
      addedAt: new Date(clock.now()).toISOString(),
    };
    const result = check(product);
    if (!result) return;
    // the photo stays on the device only if the user ticked it; if it cannot be kept, the check
    // still goes on (the photo is a convenience, not part of the result)
    if (keepPhoto && input.photo) await photos.put(product.id, input.photo);
    navigate(`/scan/result/${result.id}`);
  };

  return (
    <section className={styles.page}>
      <Link to={input.source === 'photo' ? '/scan/photo' : '/scan/paste'} className={styles.back}>
        {t('scan.back')}
      </Link>
      <h1>{t('scan.reviewTitle')}</h1>
      <p className={styles.hint}>{t('scan.reviewIntro')}</p>
      {input.source === 'photo' ? <p role="status">{t('scan.reviewFromPhoto')}</p> : null}
      {input.confidence !== null && input.confidence < LOW_CONFIDENCE ? (
        <p role="status">{t('scan.reviewLowConfidence')}</p>
      ) : null}
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
      {input.source === 'photo' ? (
        <TextInput
          label={t('scan.reviewBrandLabel')}
          value={brand}
          maxLength={120}
          onChange={setBrand}
        />
      ) : null}
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

      {input.photo ? (
        <Chip
          kind="checkbox"
          name="keep-photo"
          value="keep"
          label={t('scan.reviewKeepPhoto')}
          description={t('scan.reviewKeepPhotoHint')}
          selected={keepPhoto}
          onChange={() => setKeepPhoto((current) => !current)}
        />
      ) : null}

      {!profile ? (
        <p role="status">
          {t('scan.noProfile')} <Link to="/test">{t('home.startTest')}</Link>
        </p>
      ) : null}
      <Button disabled={!profile || items.length === 0} onClick={() => void run()}>
        {t('scan.check')}
      </Button>
    </section>
  );
}
