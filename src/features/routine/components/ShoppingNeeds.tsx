import { Link } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { useServices } from '@/lib/services';
import type { OptionalRejection, ShoppingNeedItem } from '@/logic/routine';
import { Button } from '@/ui';
import type { NeedPriority, ShoppingNeed } from '@/types';
import { categoryName, componentNames, purposeText, warningText } from '../utils/describe';
import styles from './ShoppingNeeds.module.css';

const GROUPS: readonly { priority: NeedPriority; titleKey: MessageKey }[] = [
  { priority: 'base', titleKey: 'care.groupBase' },
  { priority: 'missing', titleKey: 'care.groupMissing' },
  { priority: 'optional', titleKey: 'care.groupOptional' },
  { priority: 'not_now', titleKey: 'care.groupNotNow' },
];

const REASON_KEYS: Record<OptionalRejection, MessageKey> = {
  mode: 'care.reasonMode',
  medical: 'care.reasonMedical',
  minor: 'care.reasonMinor',
  restriction: 'care.reasonRestriction',
  not_in_goals: 'care.reasonNotInGoals',
  slot_taken: 'care.reasonSlotTaken',
};

type Props = {
  items: readonly ShoppingNeedItem[];
  states: readonly ShoppingNeed[];
  onChange: (id: string, patch: { done?: boolean; dismissed?: boolean }) => void;
};

// What to look for: characteristics, never brands. Done items stay on the list until removed.
export function ShoppingNeeds({ items, states, onChange }: Props) {
  const { content } = useServices();
  const bundle = content.bundle;
  const visible = items.filter((item) => !states.find((state) => state.id === item.id)?.dismissed);

  if (visible.length === 0) return <p>{t('care.shoppingEmpty')}</p>;

  return (
    <div className={styles.list}>
      <p className={styles.hint}>{t('care.shoppingNoBrands')}</p>
      {GROUPS.map((group) => {
        const groupItems = visible.filter((item) => item.priority === group.priority);
        if (groupItems.length === 0) return null;
        return (
          <section key={group.priority} className={styles.group}>
            <h2>{t(group.titleKey)}</h2>
            <ul className={styles.items}>
              {groupItems.map((item) => {
                const name = categoryName(item.category);
                const done = states.find((state) => state.id === item.id)?.done ?? false;
                const components = componentNames(item.componentsToLookFor, bundle);
                return (
                  <li key={item.id} className={styles.card}>
                    <h3>{name}</h3>
                    <dl className={styles.facts}>
                      <div>
                        <dt>{t('care.purpose')}</dt>
                        <dd>{purposeText(item.purposeId, bundle)}</dd>
                      </div>
                      <div>
                        <dt>{t('care.lookFor')}</dt>
                        <dd>
                          {components.length > 0 ? (
                            <ul>
                              {components.map((component, index) => (
                                <li key={`${component}-${index}`}>{component}</li>
                              ))}
                            </ul>
                          ) : (
                            t('common.contentPending')
                          )}
                        </dd>
                      </div>
                      {item.personalWarnings.length > 0 ? (
                        <div>
                          <dt>{t('care.warnings')}</dt>
                          <dd>
                            <ul>
                              {item.personalWarnings.map((warning) => {
                                const text = warningText(warning, bundle);
                                return <li key={text}>{text}</li>;
                              })}
                            </ul>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {item.reason ? (
                      <p className={styles.reason}>{t(REASON_KEYS[item.reason])}</p>
                    ) : null}

                    {item.priority !== 'not_now' ? (
                      <>
                        <label className={styles.done}>
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={(event) => onChange(item.id, { done: event.target.checked })}
                          />
                          <span>{t('care.needDone', { name })}</span>
                        </label>
                        <Link className={styles.link} to={`/scan?category=${item.category}`}>
                          {t('care.checkProduct')}
                        </Link>
                      </>
                    ) : null}
                    <Button
                      variant="text"
                      ariaLabel={t('care.needRemove', { name })}
                      onClick={() => onChange(item.id, { dismissed: true })}
                    >
                      {t('care.needRemoveShort')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
