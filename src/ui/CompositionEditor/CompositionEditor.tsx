import { useState } from 'react';
import { t } from '@/i18n';
import { Button } from '../Button';
import { TextInput } from '../TextInput';
import styles from './CompositionEditor.module.css';

/** What the editor needs to know about a position (the ParsedIngredient of a product fits). */
export type EditorItem = {
  position: number;
  raw: string;
  matchType: 'exact' | 'alias' | 'group_pattern' | 'fuzzy' | 'unknown';
  confirmed: boolean;
};

type Props<T extends EditorItem> = {
  items: readonly T[];
  /** The name to show for a matched position (the screen knows the content). */
  nameOf: (item: T) => string;
  onConfirm: (position: number) => void;
  onRemove: (position: number) => void;
  onFix: (position: number, text: string) => void;
  onAdd: (text: string) => void;
};

function UnknownRow({
  item,
  onFix,
  onRemove,
}: {
  item: EditorItem;
  onFix: (position: number, text: string) => void;
  onRemove: (position: number) => void;
}) {
  const [text, setText] = useState(item.raw);
  return (
    <li className={styles.row}>
      <TextInput
        label={t('composition.fixLabel', { raw: item.raw })}
        value={text}
        maxLength={500}
        onChange={setText}
      />
      <div className={styles.buttons}>
        <Button variant="secondary" onClick={() => onFix(item.position, text)}>
          {t('composition.fix')}
        </Button>
        <Button
          variant="text"
          ariaLabel={t('composition.removeNamed', { name: item.raw })}
          onClick={() => onRemove(item.position)}
        >
          {t('composition.remove')}
        </Button>
      </div>
    </li>
  );
}

// The review of a composition: what was recognised (chips in the order of the label), what is
// only a possible match and waits for a confirmation, and what was not recognised. The user
// can confirm, fix, delete and add. The screen decides nothing: it calls the callbacks.
export function CompositionEditor<T extends EditorItem>({
  items,
  nameOf,
  onConfirm,
  onRemove,
  onFix,
  onAdd,
}: Props<T>) {
  const [adding, setAdding] = useState('');

  const recognized = items.filter((item) => item.matchType !== 'unknown' && item.confirmed);
  const possible = items.filter((item) => item.matchType === 'fuzzy' && !item.confirmed);
  const unknown = items.filter((item) => item.matchType === 'unknown');

  const add = () => {
    if (adding.trim() === '') return;
    onAdd(adding);
    setAdding('');
  };

  return (
    <div className={styles.editor}>
      <p className={styles.total}>
        {t('composition.totalLine', { total: items.length, recognized: recognized.length })}
      </p>

      {items.length === 0 ? <p>{t('composition.empty')}</p> : null}

      {recognized.length > 0 ? (
        <section aria-labelledby="comp-recognized">
          <h3 id="comp-recognized">{t('composition.recognizedTitle')}</h3>
          <ul className={styles.chips}>
            {recognized.map((item) => (
              <li key={item.position} className={styles.chip}>
                <span>{nameOf(item)}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={t('composition.removeNamed', { name: nameOf(item) })}
                  onClick={() => onRemove(item.position)}
                >
                  {'×'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {possible.length > 0 ? (
        <section aria-labelledby="comp-possible">
          <h3 id="comp-possible">{t('composition.possibleTitle')}</h3>
          <p className={styles.hint}>{t('composition.possibleHint')}</p>
          <ul className={styles.list}>
            {possible.map((item) => (
              <li key={item.position} className={styles.row}>
                <p>{t('composition.possibleText', { raw: item.raw, name: nameOf(item) })}</p>
                <div className={styles.buttons}>
                  <Button
                    variant="secondary"
                    ariaLabel={t('composition.confirmNamed', { name: nameOf(item) })}
                    onClick={() => onConfirm(item.position)}
                  >
                    {t('composition.confirm')}
                  </Button>
                  <Button
                    variant="text"
                    ariaLabel={t('composition.removeNamed', { name: item.raw })}
                    onClick={() => onRemove(item.position)}
                  >
                    {t('composition.remove')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unknown.length > 0 ? (
        <section aria-labelledby="comp-unknown">
          <h3 id="comp-unknown">{t('composition.unknownTitle')}</h3>
          <p className={styles.hint}>{t('composition.unknownHint')}</p>
          <ul className={styles.list}>
            {unknown.map((item) => (
              <UnknownRow
                key={`${item.position}-${item.raw}`}
                item={item}
                onFix={onFix}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.add}>
        <TextInput
          label={t('composition.addLabel')}
          hint={t('composition.addHint')}
          value={adding}
          maxLength={500}
          onChange={setAdding}
        />
        <Button variant="secondary" onClick={add} disabled={adding.trim() === ''}>
          {t('composition.add')}
        </Button>
      </section>
    </div>
  );
}
