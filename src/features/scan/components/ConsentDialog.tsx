import { t } from '@/i18n';
import { Button, Modal } from '@/ui';

type Props = {
  onAgree: () => void;
  onDecline: () => void;
};

// The separate consent before the first photo is sent. The words are the ones the plan gives;
// "No" leads to typing the composition, so the app stays fully usable without the AI.
export function ConsentDialog({ onAgree, onDecline }: Props) {
  return (
    <Modal
      title={t('scan.consentTitle')}
      onClose={onDecline}
      actions={
        <>
          <Button fullWidth onClick={onAgree}>
            {t('scan.consentYes')}
          </Button>
          <Button fullWidth variant="secondary" onClick={onDecline}>
            {t('scan.consentNo')}
          </Button>
        </>
      }
    >
      <p>{t('scan.consentText')}</p>
    </Modal>
  );
}
