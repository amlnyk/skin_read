import { useId, useState, type ChangeEvent } from 'react';
import { t } from '@/i18n';
import {
  applyImport,
  checkImportFile,
  consentsDiffer,
  parseImport,
  summarizeImport,
  type ImportErrorCode,
} from '@/lib/exportImport';
import { migrate, pickPersisted, STORE_VERSION, useAppStoreApi } from '@/store';
import type { ExportFile } from '@/types';
import { Button, Chip } from '@/ui';
import { formatDate } from '../format';
import styles from '../settings.module.css';

type ImportState =
  | { kind: 'idle' }
  | { kind: 'error'; code: ImportErrorCode | 'READ_FAILED' }
  | { kind: 'preview'; file: ExportFile; replaceConsents: boolean }
  | { kind: 'done' };

// Restoring from a file, in three steps: the file is checked (size, type, JSON, schema), the user
// sees what is in it, and only then the data on this device is replaced. A bad file changes nothing.
export function ImportSection() {
  const store = useAppStoreApi();
  const inputId = useId();
  const [state, setState] = useState<ImportState>({ kind: 'idle' });

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const meta = checkImportFile({ name: file.name, size: file.size, type: file.type });
    if (!meta.ok) {
      setState({ kind: 'error', code: meta.error.code });
      input.value = '';
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ kind: 'error', code: 'READ_FAILED' });
      input.value = '';
      return;
    }
    input.value = '';
    const parsed = parseImport(text, { currentVersion: STORE_VERSION, migrate });
    setState(
      parsed.ok
        ? { kind: 'preview', file: parsed.value, replaceConsents: false }
        : { kind: 'error', code: parsed.error.code },
    );
  };

  const confirm = () => {
    if (state.kind !== 'preview') return;
    const { actions } = store.getState();
    const current = pickPersisted(store.getState());
    actions.replaceAll(
      applyImport(current, state.file, { replaceConsents: state.replaceConsents }),
    );
    setState({ kind: 'done' });
  };

  const consentDiffers =
    state.kind === 'preview' && consentsDiffer(pickPersisted(store.getState()), state.file);
  const summary = state.kind === 'preview' ? summarizeImport(state.file) : null;

  return (
    <section className={styles.card} aria-labelledby="import-title">
      <h2 id="import-title">{t('settings.importTitle')}</h2>
      <p>{t('settings.importText')}</p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          {t('settings.importChoose')}
        </label>
        <input
          id={inputId}
          className={styles.control}
          type="file"
          accept=".json,application/json"
          onChange={(event) => void onPick(event)}
        />
      </div>

      {state.kind === 'error' ? (
        <div role="alert" className={styles.error}>
          <p>{t(`settings.importError.${state.code}`)}</p>
          <p>{t('settings.importErrorNote')}</p>
        </div>
      ) : null}

      {state.kind === 'done' ? <p role="status">{t('settings.importDone')}</p> : null}

      {state.kind === 'preview' && summary ? (
        <div className={styles.preview}>
          <h3>{t('settings.importPreviewTitle')}</h3>
          <ul className={styles.lines}>
            <li>{t('settings.importCreated', { date: formatDate(summary.exportedAt) })}</li>
            <li>
              {t('settings.importProfile', {
                state: summary.hasProfile
                  ? t('settings.storedProfileYes')
                  : t('settings.storedProfileNo'),
              })}
            </li>
            <li>{t('settings.importJournal', { count: summary.journalCount })}</li>
            <li>{t('settings.importProducts', { count: summary.productsCount })}</li>
            <li>{t('settings.importScans', { count: summary.scansCount })}</li>
          </ul>

          {consentDiffers ? (
            <>
              <p>
                {t('settings.importConsentAsk', {
                  state: summary.fileConsentGranted
                    ? t('settings.importConsentGranted')
                    : t('settings.importConsentNotGranted'),
                })}
              </p>
              <Chip
                kind="checkbox"
                name="import-consent"
                value="consent"
                label={t('settings.importConsentCheck')}
                selected={state.replaceConsents}
                onChange={() => setState({ ...state, replaceConsents: !state.replaceConsents })}
              />
            </>
          ) : null}

          <div className={styles.actions}>
            <Button fullWidth onClick={confirm}>
              {t('settings.importConfirm')}
            </Button>
            <Button fullWidth variant="secondary" onClick={() => setState({ kind: 'idle' })}>
              {t('settings.importCancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
