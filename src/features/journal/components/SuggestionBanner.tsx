import { t } from '@/i18n';
import type { SymptomKey } from '@/logic/journal';
import { Button } from '@/ui';
import styles from '../pages/JournalPage.module.css';

type Props = {
  symptoms: readonly SymptomKey[];
  onUpdate: () => void;
  onLater: () => void;
};

// "You marked ... several times. Update the profile?" A question, not a conclusion: it says
// nothing about the cause and changes nothing until the user confirms on the profile screens.
export function SuggestionBanner({ symptoms, onUpdate, onLater }: Props) {
  const names = symptoms.map((key) => t(`journal.symptom.${key}`).toLowerCase()).join(', ');
  return (
    <aside className={styles.banner} aria-label={t('journal.bannerUpdate')}>
      <p>{t('journal.bannerText', { symptoms: names })}</p>
      <p className={styles.hint}>{t('journal.bannerHint')}</p>
      <div className={styles.actions}>
        <Button fullWidth onClick={onUpdate}>
          {t('journal.bannerUpdate')}
        </Button>
        <Button fullWidth variant="secondary" onClick={onLater}>
          {t('journal.bannerLater')}
        </Button>
      </div>
    </aside>
  );
}
