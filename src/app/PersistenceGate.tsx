import type { ReactNode } from 'react';
import { downloadTextFile } from '@/lib/download';
import { useServices } from '@/lib/services';
import { t } from '@/i18n';
import { useAppStore, useAppStoreApi } from '@/store';
import { DataCorruptedScreen } from './DataCorruptedScreen';
import styles from './PersistenceGate.module.css';

type Props = { children: ReactNode };

// Between the store and the router:
// - corrupted saved data: the "Дані пошкоджені" screen instead of the app;
// - storage unavailable or full: the app works, with a visible banner (no white screen).
export function PersistenceGate({ children }: Props) {
  const persistence = useAppStore((state) => state.persistence);
  const store = useAppStoreApi();
  const { clock } = useServices();

  if (persistence.kind === 'corrupt') {
    const download = () => {
      const day = new Date(clock.now()).toISOString().slice(0, 10);
      downloadTextFile(`skinbarrier-raw-data-${day}.txt`, persistence.rawCopy);
    };
    return (
      <DataCorruptedScreen
        onDownload={download}
        onReset={() => store.getState().actions.discardCorruptedData()}
      />
    );
  }

  return (
    <>
      {persistence.kind === 'memory_only' && (
        <div className={styles.banner} role="status">
          {t('persistence.memoryOnly')}
        </div>
      )}
      {children}
    </>
  );
}
