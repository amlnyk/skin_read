import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { useServices } from '@/lib/services';
import { categoriesOf, searchGroups, searchIngredients, ungroupedIngredients } from '@/logic/inci';
import { LIMITS } from '@/schemas';
import { EducationPlaceholder } from '../components/EducationPlaceholder';
import { GroupChips } from '../components/GroupChips';
import { GroupList } from '../components/GroupList';
import { IngredientList } from '../components/IngredientList';
import styles from './ReferencePage.module.css';

type Tab = 'components' | 'education';

const UNGROUPED = '__ungrouped__';

const TABS: readonly { id: Tab; labelKey: MessageKey }[] = [
  { id: 'components', labelKey: 'reference.tabComponents' },
  { id: 'education', labelKey: 'reference.tabEducation' },
];

// "Довідник": search, category filter, groups and ingredient cards, plus the (empty) tab of
// educational materials. The content comes through the content policy, so records that
// are not allowed to be shown never get here.
export function ReferencePage() {
  const { content } = useServices();
  const bundle = content.bundle;
  const searchId = useId();
  const categoryId = useId();
  const [tab, setTab] = useState<Tab>('components');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  // '' = all groups, UNGROUPED = the ingredients without a group, otherwise a group id
  const [view, setView] = useState('');

  const categories = useMemo(() => categoriesOf(bundle), [bundle]);
  const searching = query.trim() !== '' || category !== '';
  const foundIngredients = useMemo(
    () => (searching ? searchIngredients(query, bundle, { category: category || null }) : []),
    [searching, query, bundle, category],
  );
  // the groups are searched by name only, so a category filter hides them
  const foundGroups = useMemo(
    () => (searching && category === '' ? searchGroups(query, bundle) : []),
    [searching, query, bundle, category],
  );
  const ungrouped = useMemo(() => ungroupedIngredients(bundle), [bundle]);
  // the quick filter lists only groups that have a name; a nameless one stays in "Усі"
  const namedGroups = useMemo(
    () => bundle.ingredientGroups.filter((item) => item.nameUk !== null),
    [bundle],
  );
  const pickedGroup = bundle.ingredientGroups.find((item) => item.id === view) ?? null;
  const showAll = pickedGroup === null && view !== UNGROUPED;

  const found = foundIngredients.length + foundGroups.length;
  const hasAnything = bundle.ingredientGroups.length + bundle.ingredients.length > 0;

  return (
    <section className={styles.page}>
      <h1>{t('nav.reference')}</h1>

      <Link to="/reference/compat" className={styles.compatLink}>
        <span className={styles.compatTitle}>{t('compat.linkTitle')}</span>
        <span className={styles.hint}>{t('compat.linkHint')}</span>
      </Link>

      <div role="tablist" aria-label={t('reference.tabsLabel')} className={styles.tabs}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`reference-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="reference-panel"
            className={tab === item.id ? `${styles.tab} ${styles.selected}` : styles.tab}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="reference-panel" aria-labelledby={`reference-tab-${tab}`}>
        {tab === 'education' ? (
          <EducationPlaceholder />
        ) : (
          <div className={styles.components}>
            <p className={styles.hint}>{t('reference.intro')}</p>

            <div className={styles.field}>
              <label htmlFor={searchId}>{t('reference.searchLabel')}</label>
              <input
                id={searchId}
                type="search"
                className={styles.input}
                value={query}
                maxLength={LIMITS.name}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
              />
              <span className={styles.hint}>{t('reference.searchHint')}</span>
            </div>

            {categories.length > 0 ? (
              <div className={styles.field}>
                <label htmlFor={categoryId}>{t('reference.categoryLabel')}</label>
                <select
                  id={categoryId}
                  className={styles.input}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">{t('reference.categoryAll')}</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {!searching && namedGroups.length > 0 ? (
              <GroupChips
                chips={[
                  { id: '', label: t('reference.groupFilterAll') },
                  ...namedGroups.flatMap((item) =>
                    item.nameUk === null ? [] : [{ id: item.id, label: item.nameUk }],
                  ),
                  ...(ungrouped.length > 0
                    ? [{ id: UNGROUPED, label: t('reference.groupFilterUngrouped') }]
                    : []),
                ]}
                selected={view}
                onSelect={setView}
              />
            ) : null}

            {searching ? (
              found === 0 ? (
                <div role="status" className={styles.empty}>
                  <h2>{t('reference.nothingFound')}</h2>
                  <p>{t('reference.nothingFoundHint')}</p>
                </div>
              ) : (
                <div className={styles.results}>
                  <p role="status" className={styles.hint}>
                    {t('reference.resultCount', { count: found })}
                  </p>
                  {foundGroups.length > 0 ? (
                    <section className={styles.section}>
                      <h2>{t('reference.groupsTitle')}</h2>
                      <GroupList
                        groups={foundGroups}
                        ingredients={bundle.ingredients}
                        withMembers={false}
                      />
                    </section>
                  ) : null}
                  {foundIngredients.length > 0 ? (
                    <section className={styles.section}>
                      <h2>{t('reference.resultsTitle')}</h2>
                      <IngredientList ingredients={foundIngredients} all={bundle.ingredients} />
                    </section>
                  ) : null}
                </div>
              )
            ) : hasAnything ? (
              <div className={styles.results}>
                {bundle.ingredients.length === 0 ? (
                  <p className={styles.hint}>{t('reference.noIngredientsYet')}</p>
                ) : null}
                {pickedGroup !== null ? (
                  <section className={styles.section}>
                    <h2>{t('reference.groupsTitle')}</h2>
                    <GroupList
                      key={pickedGroup.id}
                      groups={[pickedGroup]}
                      ingredients={bundle.ingredients}
                      open
                    />
                  </section>
                ) : null}
                {showAll && bundle.ingredientGroups.length > 0 ? (
                  <section className={styles.section}>
                    <h2>{t('reference.groupsTitle')}</h2>
                    <GroupList groups={bundle.ingredientGroups} ingredients={bundle.ingredients} />
                  </section>
                ) : null}
                {(showAll || view === UNGROUPED) && ungrouped.length > 0 ? (
                  <section className={styles.section}>
                    <h2>{t('reference.ungroupedTitle')}</h2>
                    <IngredientList ingredients={ungrouped} all={bundle.ingredients} />
                  </section>
                ) : null}
              </div>
            ) : (
              <p>{t('reference.noContent')}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
