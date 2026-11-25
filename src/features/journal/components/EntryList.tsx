import { useState } from 'react';
import { t } from '@/i18n';
import type { JournalEntry, Product } from '@/types';
import { Button, Modal } from '@/ui';
import { describeEntry } from '../utils/describeEntry';
import styles from '../pages/JournalPage.module.css';
import { formatDate } from '../utils/today';

type Props = {
  entries: readonly JournalEntry[];
  products: readonly Product[];
  onDelete: (id: string) => void;
};

// The history: newest first. The note and every other text are shown as plain text only.
export function EntryList({ entries, products, onDelete }: Props) {
  const [deleting, setDeleting] = useState<JournalEntry | null>(null);

  if (entries.length === 0) return <p className={styles.empty}>{t('journal.listEmpty')}</p>;

  return (
    <section aria-labelledby="journal-list-title">
      <h2 id="journal-list-title">{t('journal.listTitle')}</h2>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.entry}>
            <h3>{formatDate(entry.date)}</h3>
            <ul className={styles.lines}>
              {describeEntry(entry, products).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {entry.note === '' ? null : <p className={styles.note}>{entry.note}</p>}
            <Button
              variant="text"
              ariaLabel={t('journal.entryDelete', { date: formatDate(entry.date) })}
              onClick={() => setDeleting(entry)}
            >
              {t('journal.delete')}
            </Button>
          </li>
        ))}
      </ul>

      {deleting ? (
        <Modal
          title={t('journal.deleteTitle')}
          onClose={() => setDeleting(null)}
          actions={
            <>
              <Button
                fullWidth
                onClick={() => {
                  onDelete(deleting.id);
                  setDeleting(null);
                }}
              >
                {t('journal.deleteConfirm')}
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setDeleting(null)}>
                {t('journal.deleteCancel')}
              </Button>
            </>
          }
        >
          <p>{t('journal.deleteText', { date: formatDate(deleting.date) })}</p>
        </Modal>
      ) : null}
    </section>
  );
}
