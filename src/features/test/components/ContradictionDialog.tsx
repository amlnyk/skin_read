import { t } from '@/i18n';
import { Button, Modal } from '@/ui';
import type { ContradictionChoice } from '../hooks/useTestFlow';

type Props = { onChoose: (choice: ContradictionChoice) => void };

// A soft question, not a block: both answers can stay. Escape means "keep both".
export function ContradictionDialog({ onChoose }: Props) {
  return (
    <Modal
      title={t('test.contradictionTitle')}
      onClose={() => onChoose('keep_both')}
      actions={
        <>
          <Button fullWidth onClick={() => onChoose('keep_both')}>
            {t('test.keepBoth')}
          </Button>
          <Button fullWidth variant="secondary" onClick={() => onChoose('remove_stable')}>
            {t('test.removeStable')}
          </Button>
        </>
      }
    >
      <p>{t('test.contradictionText')}</p>
    </Modal>
  );
}
