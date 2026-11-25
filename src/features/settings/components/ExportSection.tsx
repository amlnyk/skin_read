import { useState } from 'react';
import { t } from '@/i18n';
import { downloadTextFile } from '@/lib/download';
import { createExport, exportFileName, serializeExport } from '@/lib/exportImport';
import { useServices } from '@/lib/services';
import { pickPersisted, STORE_VERSION, useAppStoreApi } from '@/store';
import { Button } from '@/ui';
import styles from '../styles/settings.module.css';

// Everything the app saves goes into one JSON file on the user's own device. Nothing is sent anywhere.
export function ExportSection() {
  const { clock } = useServices();
  const store = useAppStoreApi();
  const [savedName, setSavedName] = useState<string | null>(null);

  const save = () => {
    const now = clock.now();
    const file = createExport(pickPersisted(store.getState()), STORE_VERSION, now);
    const name = exportFileName(now);
    downloadTextFile(name, serializeExport(file), 'application/json');
    setSavedName(name);
  };

  return (
    <section className={styles.card} aria-labelledby="export-title">
      <h2 id="export-title">{t('settings.exportTitle')}</h2>
      <p>{t('settings.exportText')}</p>
      <p className={styles.hint}>{t('settings.exportPhotosNote')}</p>
      <Button fullWidth onClick={save}>
        {t('settings.exportButton')}
      </Button>
      {savedName ? <p role="status">{t('settings.exportDone', { name: savedName })}</p> : null}
    </section>
  );
}
