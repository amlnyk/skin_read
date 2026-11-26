import { t } from '@/i18n';
import type { TextBlockRef } from '@/logic/profile';
import { QUESTION_IDS } from '@/schemas';
import type { ContentBundle } from '@/types';
import { optionLabel } from '../utils/labels';
import styles from './TextBlocks.module.css';

type Props = {
  blocks: readonly TextBlockRef[];
  content: ContentBundle;
};

// One block per skin type and condition. The text comes from content only; while it is
// missing the block says so instead of showing anything made up.
export function TextBlocks({ blocks, content }: Props) {
  return (
    <div className={styles.blocks}>
      {blocks.map((block) => {
        // The name is always known (from the spec); the description only when the analysis
        // found a text for it (contentId): otherwise the block says "being prepared".
        const record =
          block.kind === 'skin_type'
            ? content.skinTypes.find((item) => item.baseType === block.key)
            : content.conditions.find((item) => item.condition === block.key);
        const questionId =
          block.kind === 'skin_type' ? QUESTION_IDS.baseType : QUESTION_IDS.conditions;
        const name = record?.nameUk ?? optionLabel(content.questionnaire, questionId, block.key);
        const description = block.contentId === null ? null : (record?.description ?? null);
        // Recommendations for this type or condition, one line of the text per point.
        const recommendations = content.recommendations.filter((item) =>
          block.kind === 'skin_type'
            ? item.target.baseTypes.includes(block.key)
            : item.target.conditions.includes(block.key),
        );
        return (
          <section key={`${block.kind}:${block.key}`} className={styles.block}>
            <h3>{name}</h3>
            <p>{description ?? t('common.contentPending')}</p>
            {recommendations.map((item) =>
              item.text ? (
                <div key={item.id} className={styles.recommendations}>
                  <h4>{item.title ?? t('profile.recommendationsTitle')}</h4>
                  <ul>
                    {item.text
                      .split('\n')
                      .filter(Boolean)
                      .map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                  </ul>
                </div>
              ) : null,
            )}
          </section>
        );
      })}
    </div>
  );
}
