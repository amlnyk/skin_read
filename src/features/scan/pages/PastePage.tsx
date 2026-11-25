import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { LIMITS } from '@/schemas';
import { Button, Field } from '@/ui';
import styles from '../scan.module.css';

// "Перевірка складу": a text field and "Розібрати". The text goes to the review screen.
export function PastePage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');

  return (
    <section className={styles.page}>
      <Link to="/scan" className={styles.back}>
        {t('scan.back')}
      </Link>
      <h1>{t('scan.pasteTitle')}</h1>
      <p className={styles.hint}>{t('scan.pasteHint')}</p>
      <Field
        label={t('scan.pasteLabel')}
        value={text}
        onChange={setText}
        maxLength={LIMITS.inciRaw}
      />
      <Button
        disabled={text.trim() === ''}
        onClick={() => navigate('/scan/review', { state: { text } })}
      >
        {t('scan.parse')}
      </Button>
    </section>
  );
}
