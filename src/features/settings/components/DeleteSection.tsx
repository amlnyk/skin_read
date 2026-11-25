import { useState } from 'react';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { createInitialData, pickPersisted, useAppStoreApi } from '@/store';
import { Button, Modal } from '@/ui';
import {
  DATA_CATEGORIES,
  deleteCategory,
  photoIdsToKeep,
  type DataCategory,
} from '../utils/dataCategories';
import styles from '../styles/settings.module.css';

type Pending = DataCategory | 'all' | null;

// Deleting one kind of data, or everything. Every deletion asks first and cannot be undone.
export function DeleteSection() {
  const { clock, photos } = useServices();
  const store = useAppStoreApi();
  const [pending, setPending] = useState<Pending>(null);
  const [done, setDone] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const confirm = () => {
    if (pending === null) return;
    const { actions } = store.getState();
    // which photos stay is worked out from the state as it is now: afterwards nothing tells which
    // ones belonged to the deleted part
    const keep = photoIdsToKeep(pickPersisted(store.getState()), pending);
    if (pending === 'all') {
      // The welcome screens stay "seen": the app opens empty, and a copy can be restored right here.
      actions.replaceAll({ ...createInitialData(), onboarding: { completed: true } });
    } else {
      const nowIso = new Date(clock.now()).toISOString();
      actions.replaceAll(deleteCategory(pickPersisted(store.getState()), pending, nowIso));
    }
    const everything = pending === 'all';
    setPending(null);
    setDone(true);
    setPhotoError(false);
    if (keep === null) return;
    // a photo that cannot be deleted is not hidden: the screen says so
    void (everything ? photos.clear() : photos.retainOnly(keep)).then((cleaned) => {
      if (!cleaned.ok) setPhotoError(true);
    });
  };

  const title =
    pending === 'all'
      ? t('settings.deleteAllTitle')
      : pending
        ? t('settings.categoryTitle', { name: t(`settings.category.${pending}`) })
        : '';

  return (
    <section className={styles.card} aria-labelledby="delete-title">
      <h2 id="delete-title">{t('settings.deletePartTitle')}</h2>
      <div className={styles.actions}>
        {DATA_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant="secondary"
            fullWidth
            onClick={() => {
              setDone(false);
              setPending(category);
            }}
          >
            {t('settings.categoryButton', { name: t(`settings.category.${category}`) })}
          </Button>
        ))}
      </div>

      <h2>{t('settings.deleteAllTitle')}</h2>
      <p>{t('settings.deleteAllText')}</p>
      <Button
        variant="secondary"
        fullWidth
        onClick={() => {
          setDone(false);
          setPending('all');
        }}
      >
        {t('settings.deleteAllButton')}
      </Button>

      {done ? <p role="status">{t('settings.deleteDone')}</p> : null}
      {done && photoError ? <p role="alert">{t('settings.photosNotDeleted')}</p> : null}

      {pending !== null ? (
        <Modal
          title={title}
          onClose={() => setPending(null)}
          actions={
            <>
              <Button fullWidth onClick={confirm}>
                {pending === 'all' ? t('settings.deleteAllConfirm') : t('settings.deleteConfirm')}
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setPending(null)}>
                {t('settings.deleteCancel')}
              </Button>
            </>
          }
        >
          <p>
            {pending === 'all'
              ? t('settings.deleteAllText')
              : t(`settings.categoryText.${pending}`)}
          </p>
        </Modal>
      ) : null}
    </section>
  );
}
