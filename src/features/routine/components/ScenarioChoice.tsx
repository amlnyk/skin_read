import { useState } from 'react';
import { t } from '@/i18n';
import { ADDABLE_CATEGORIES } from '@/logic/routine';
import { Button, Chip } from '@/ui';
import type { ProductCategory, Scenario } from '@/types';
import { categoryName } from '../describe';
import styles from './ScenarioChoice.module.css';

type Props = {
  onChoose: (scenario: Scenario, owned: ProductCategory[]) => void;
  /** Present when the user is changing an earlier answer. */
  onCancel?: () => void;
};

// "Do you already have a care routine?": No / Yes / Partly / Skip.
// For "Yes" and "Partly" the user also marks the categories they already have.
export function ScenarioChoice({ onChoose, onCancel }: Props) {
  const [picking, setPicking] = useState<'have' | 'partial' | null>(null);
  const [owned, setOwned] = useState<ProductCategory[]>([]);

  const toggle = (category: ProductCategory) =>
    setOwned((list) =>
      list.includes(category) ? list.filter((item) => item !== category) : [...list, category],
    );

  if (picking) {
    return (
      <section className={styles.block}>
        <h2>{t('care.ownedTitle')}</h2>
        <p className={styles.hint}>{t('care.ownedHint')}</p>
        <div className={styles.chips}>
          {ADDABLE_CATEGORIES.map((category) => (
            <Chip
              key={category}
              kind="checkbox"
              name="owned-category"
              value={category}
              label={categoryName(category)}
              selected={owned.includes(category)}
              onChange={() => toggle(category)}
            />
          ))}
        </div>
        <Button fullWidth onClick={() => onChoose(picking, owned)}>
          {t('care.ownedBuild')}
        </Button>
        <Button fullWidth variant="secondary" onClick={() => setPicking(null)}>
          {t('care.ownedBack')}
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.block}>
      <h2>{t('care.scenarioQuestion')}</h2>
      <Button fullWidth onClick={() => onChoose('none', [])}>
        {t('care.scenarioNone')}
      </Button>
      <Button fullWidth variant="secondary" onClick={() => setPicking('have')}>
        {t('care.scenarioHave')}
      </Button>
      <Button fullWidth variant="secondary" onClick={() => setPicking('partial')}>
        {t('care.scenarioPartial')}
      </Button>
      <Button fullWidth variant="text" onClick={() => onChoose('skipped', [])}>
        {t('care.scenarioSkip')}
      </Button>
      {onCancel ? (
        <Button fullWidth variant="text" onClick={onCancel}>
          {t('care.addCancel')}
        </Button>
      ) : null}
    </section>
  );
}
