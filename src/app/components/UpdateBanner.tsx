import { useSyncExternalStore } from 'react';
import { t } from '@/i18n';
import type { UpdateNotifier } from '@/lib/pwa';
import { Button } from '@/ui';
import styles from './UpdateBanner.module.css';

type Props = { updates: UpdateNotifier };

// "A new version is available". The update is never forced: the page reloads only on the
// person's choice, so a half-filled form is not lost.
export function UpdateBanner({ updates }: Props) {
  const visible = useSyncExternalStore(updates.subscribe, updates.getSnapshot, updates.getSnapshot);
  if (!visible) return null;
  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>{t('update.available')}</p>
      <div className={styles.actions}>
        <Button onClick={updates.apply}>{t('update.apply')}</Button>
        <Button variant="secondary" onClick={updates.dismiss}>
          {t('update.later')}
        </Button>
      </div>
    </div>
  );
}
