import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { compositionText } from '@/logic/analyze';
import { frequencySchema, productCategorySchema, slotSchema } from '@/schemas';
import { useAppStore, useAppStoreApi } from '@/store';
import type {
  CompositionSource,
  DeclaredConcentration,
  Frequency,
  ParsedIngredient,
  Product,
  ProductCategory,
  Slot,
} from '@/types';
import { Button, Chip, Select, TextInput } from '@/ui';
import { CompositionBuilder } from '../components/CompositionBuilder';
import styles from '../products.module.css';

type Mode = 'paste' | 'manual' | 'name';

const MODES: readonly {
  value: Mode;
  labelKey: 'products.modePaste' | 'products.modeManual' | 'products.modeName';
}[] = [
  { value: 'paste', labelKey: 'products.modePaste' },
  { value: 'manual', labelKey: 'products.modeManual' },
  { value: 'name', labelKey: 'products.modeName' },
];

const SOURCES: Record<Mode, CompositionSource> = {
  paste: 'pasted',
  manual: 'manual',
  name: 'unknown',
};

// "Додати засіб": a name and a category are required; the composition comes by pasting a
// text, by picking components, or not at all (then the product is "Потрібен склад" and it is
// never analysed). The label photo is announced but not available yet.
export function AddProductPage() {
  const { content, ids, clock } = useServices();
  const store = useAppStoreApi();
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);

  const [mode, setMode] = useState<Mode>('paste');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('serum');
  const [slot, setSlot] = useState<Slot | ''>('');
  const [frequency, setFrequency] = useState<Frequency | ''>('');
  const [items, setItems] = useState<ParsedIngredient[]>([]);
  const [declared, setDeclared] = useState<DeclaredConcentration[]>([]);
  const [showError, setShowError] = useState(false);

  const build = (): Product => {
    const hasItems = mode !== 'name' && items.length > 0;
    return {
      id: `product-${ids.next()}`,
      name: name.trim(),
      ...(brand.trim() !== '' ? { brand: brand.trim() } : {}),
      category,
      inciRaw: hasItems ? compositionText(items) : '',
      ingredients: hasItems ? items : [],
      ...(hasItems && declared.length > 0 ? { declaredConcentrations: declared } : {}),
      compositionSource: hasItems ? SOURCES[mode] : 'unknown',
      ...(slot !== '' ? { slot } : {}),
      ...(frequency !== '' ? { frequency } : {}),
      userReactions: [],
      addedAt: new Date(clock.now()).toISOString(),
    };
  };

  const save = (then: 'card' | 'check') => {
    if (name.trim() === '') {
      setShowError(true);
      return;
    }
    const product = build();
    store.getState().actions.products.add(product);
    navigate(then === 'check' ? `/scan/check/${product.id}` : `/care/products/${product.id}`);
  };

  const hasItems = mode !== 'name' && items.length > 0;

  return (
    <section className={styles.page}>
      <Link to="/care/products" className={styles.back}>
        {t('products.title')}
      </Link>
      <h1>{t('products.addTitle')}</h1>

      <TextInput label={t('products.nameLabel')} value={name} maxLength={120} onChange={setName} />
      {showError && name.trim() === '' ? <p role="alert">{t('products.nameRequired')}</p> : null}
      <TextInput
        label={t('products.brandLabel')}
        value={brand}
        maxLength={120}
        onChange={setBrand}
      />
      <Select
        label={t('products.categoryLabel')}
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
      <Select
        label={t('products.slotLabel')}
        value={slot}
        options={[
          { value: '', label: t('products.slotNone') },
          ...slotSchema.options.map((value) => ({
            value,
            label: value === 'am' ? t('products.slotAm') : t('products.slotPm'),
          })),
        ]}
        onChange={(value) => {
          const parsed = slotSchema.safeParse(value);
          setSlot(parsed.success ? parsed.data : '');
        }}
      />
      <Select
        label={t('products.frequencyLabel')}
        value={frequency}
        options={[
          { value: '', label: t('products.frequencyNone') },
          ...frequencySchema.options.map((value) => ({ value, label: t(`frequency.${value}`) })),
        ]}
        onChange={(value) => {
          const parsed = frequencySchema.safeParse(value);
          setFrequency(parsed.success ? parsed.data : '');
        }}
      />

      <fieldset className={styles.modes}>
        <legend>{t('products.modeTitle')}</legend>
        {MODES.map((entry) => (
          <Chip
            key={entry.value}
            kind="radio"
            name="composition-mode"
            value={entry.value}
            label={t(entry.labelKey)}
            selected={mode === entry.value}
            onChange={() => setMode(entry.value)}
          />
        ))}
        <button type="button" className={`${styles.linkButton} ${styles.disabled}`} disabled>
          {`${t('products.modePhoto')}: ${t('products.photoSoon')}`}
        </button>
      </fieldset>

      {mode === 'name' ? (
        <p className={styles.hint}>{t('products.nameOnlyHint')}</p>
      ) : (
        <CompositionBuilder
          mode={mode}
          content={content.bundle}
          items={items}
          onChange={(next, concentrations) => {
            setItems(next);
            if (concentrations) setDeclared(concentrations);
          }}
        />
      )}

      <div className={styles.actions}>
        <Button onClick={() => save('card')}>{t('products.save')}</Button>
        {hasItems && profile ? (
          <Button variant="secondary" onClick={() => save('check')}>
            {t('products.saveAndCheck')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
