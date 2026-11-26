import { t } from '@/i18n';
import type { Ingredient } from '@/schemas';
import styles from './IngredientCard.module.css';

type Props = {
  ingredient: Ingredient;
  /** Every visible ingredient: known interactions are shown by name. */
  all: readonly Ingredient[];
  /** The name as a heading. The modal shows the name in its own title, so it turns this off. */
  withTitle?: boolean;
};

const hasText = (value: string | null): value is string => value !== null && value.trim() !== '';

function Text({ value }: { value: string | null }) {
  return <>{hasText(value) ? value : t('common.contentPending')}</>;
}

function List({ items }: { items: readonly string[] }) {
  if (items.length === 0) return <>{t('common.contentPending')}</>;
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

// The card of one ingredient (shown in a modal from the lists). Facts only: no "good" or "bad" marks and no signal colours.
// A field that the cosmetologist has not filled in yet says "Інформація готується".
export function IngredientCard({ ingredient, all, withTitle = true }: Props) {
  const interactions = ingredient.knownInteractions
    .map((id) => all.find((other) => other.id === id))
    .filter((other): other is Ingredient => other !== undefined)
    .map((other) => (hasText(other.nameUk) ? other.nameUk : other.inci));
  const cautions = ingredient.cautions.map((caution) => caution.text).filter(hasText);

  return (
    <article className={styles.card}>
      {withTitle ? (
        <h3>
          <Text value={ingredient.nameUk} />
        </h3>
      ) : null}
      {ingredient.reviewStatus === 'verified' ? null : (
        <p className={styles.draft}>{t('reference.draftNote')}</p>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>{t('reference.inci')}</dt>
          <dd>{ingredient.inci}</dd>
        </div>
        <div>
          <dt>{t('reference.synonyms')}</dt>
          <dd>
            <List items={ingredient.aliases} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.category')}</dt>
          <dd>
            <Text value={ingredient.category} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.purpose')}</dt>
          <dd>
            <Text value={ingredient.purpose} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.properties')}</dt>
          <dd>
            <List items={ingredient.properties} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.cautions')}</dt>
          <dd>
            <List items={cautions} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.usage')}</dt>
          <dd>
            <Text value={ingredient.usage} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.interactions')}</dt>
          <dd>
            <List items={interactions} />
          </dd>
        </div>
        <div>
          <dt>{t('reference.source')}</dt>
          <dd>{ingredient.source}</dd>
        </div>
      </dl>
    </article>
  );
}
