import { t } from '@/i18n';
import type { TextBlockRef } from '@/logic/profile';
import { QUESTION_IDS } from '@/schemas';
import type { ContentBundle } from '@/types';
import { optionLabel } from '../labels';
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
        return (
          <section key={`${block.kind}:${block.key}`} className={styles.block}>
            <h3>{name}</h3>
            <p>{description ?? t('common.contentPending')}</p>
          </section>
        );
      })}
    </div>
  );
}
