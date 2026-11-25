import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { useServices } from '@/lib/services';
import { pickPersisted, useAppStore } from '@/store';
import { DeleteSection } from '../components/DeleteSection';
import { ExportSection } from '../components/ExportSection';
import { ImportSection } from '../components/ImportSection';
import { StoredList } from '../components/StoredList';
import styles from '../settings.module.css';

// "My data": what is stored, a copy to a file, restoring from a file, deleting.
export function DataPage() {
  // The whole state is read on purpose: the counts must follow every change. The saved part is
  // picked outside of the selector, so no new object is made on every read.
  const state = useAppStore((current) => current);
  const data = pickPersisted(state);
  const { photos } = useServices();

  // How many photos are on this device. It is read again when the products or checks change
  // (a deletion or an import changes them); null while unknown or when the store cannot be read.
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void photos.keys().then((result) => {
      if (!cancelled) setPhotoCount(result.ok ? result.value.length : null);
    });
    return () => {
      cancelled = true;
    };
  }, [photos, state.products, state.scans]);

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/profile/settings">
        {t('settings.back')}
      </Link>
      <h1>{t('settings.dataTitle')}</h1>
      <StoredList data={data} photoCount={photoCount} />
      <ExportSection />
      <ImportSection />
      <DeleteSection />
    </section>
  );
}
