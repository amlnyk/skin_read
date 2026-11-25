import { useState } from 'react';
import { t } from '@/i18n';
import {
  appendText,
  confirmPosition,
  ingredientName,
  prepareComposition,
  removePosition,
  replacePosition,
} from '@/logic/analyze';
import { searchIngredients } from '@/logic/inci';
import { LIMITS } from '@/schemas';
import type { ContentBundle, DeclaredConcentration, ParsedIngredient } from '@/types';
import { Button, CompositionEditor, Field, TextInput } from '@/ui';
import styles from '../products.module.css';

type Props = {
  mode: 'paste' | 'manual';
  content: ContentBundle;
  items: ParsedIngredient[];
  onChange: (items: ParsedIngredient[], declared?: DeclaredConcentration[]) => void;
};

const MAX_RESULTS = 8;

// Gets a composition into the list: by pasting a text ("Розібрати") or by picking components
// from the reference. After that the same review as in the scanner: confirm, fix, delete, add.
export function CompositionBuilder({ mode, content, items, onChange }: Props) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  const found = query.trim() === '' ? [] : searchIngredients(query, content).slice(0, MAX_RESULTS);

  return (
    <div className={styles.section}>
      {mode === 'paste' ? (
        <>
          <Field
            label={t('products.pasteLabel')}
            value={text}
            onChange={setText}
            maxLength={LIMITS.inciRaw}
          />
          <Button
            variant="secondary"
            disabled={text.trim() === ''}
            onClick={() => {
              const prepared = prepareComposition(text, content);
              onChange(prepared.ingredients, prepared.declaredConcentrations);
            }}
          >
            {t('products.parse')}
          </Button>
        </>
      ) : (
        <>
          <TextInput
            label={t('products.manualSearch')}
            value={query}
            maxLength={120}
            onChange={setQuery}
          />
          {query.trim() !== '' && found.length === 0 ? (
            <p className={styles.hint}>{t('products.manualNothing')}</p>
          ) : null}
          <ul className={styles.results}>
            {found.map((ingredient) => (
              <li key={ingredient.id}>
                <Button
                  variant="secondary"
                  fullWidth
                  ariaLabel={t('products.manualPick', {
                    name: ingredientName(ingredient.id, content.ingredients),
                  })}
                  onClick={() => {
                    onChange(appendText(items, ingredient.inci, content));
                    setQuery('');
                  }}
                >
                  {ingredientName(ingredient.id, content.ingredients)}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {items.length > 0 || mode === 'manual' ? (
        <CompositionEditor
          items={items}
          nameOf={(item) =>
            item.ingredientId ? ingredientName(item.ingredientId, content.ingredients) : item.raw
          }
          onConfirm={(position) => onChange(confirmPosition(items, position))}
          onRemove={(position) => onChange(removePosition(items, position))}
          onFix={(position, fixed) => onChange(replacePosition(items, position, fixed, content))}
          onAdd={(added) => onChange(appendText(items, added, content))}
        />
      ) : null}
    </div>
  );
}
