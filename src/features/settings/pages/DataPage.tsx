import { Link } from 'react-router-dom';
import { t } from '@/i18n';
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

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/profile/settings">
        {t('settings.back')}
      </Link>
      <h1>{t('settings.dataTitle')}</h1>
      <StoredList data={data} />
      <ExportSection />
      <ImportSection />
      <DeleteSection />
    </section>
  );
}
