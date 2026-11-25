import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { resizeImage } from '@/lib/image';
import { useServices } from '@/lib/services';
import { useAppStore, useAppStoreApi } from '@/store';
import { Button, PhotoPreview } from '@/ui';
import { ConsentDialog } from '../components/ConsentDialog';
import styles from '../styles/scan.module.css';

type Photo = { blob: Blob; url: string };
type Status = 'idle' | 'preparing' | 'reading';

const TIPS: readonly MessageKey[] = ['scan.tipClose', 'scan.tipLight', 'scan.tipOnlyList'];

// "Сфотографувати етикетку": a photo from the camera or the gallery, shrunk on the device, shown
// for a look, and (after the consent) sent to be read. The text that comes back goes to the same
// review screen as a pasted one, where it can be corrected. Every failure has a plain message
// and the way to type the composition instead.
export function PhotoPage() {
  const { labelReader, imageDeps, clock, features } = useServices();
  const store = useAppStoreApi();
  const navigate = useNavigate();
  const consent = useAppStore((state) => state.settings.consents.photoToAi);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<MessageKey | null>(null);
  const [asking, setAsking] = useState(false);

  // the address of the shown picture is freed when it changes or the screen goes away
  const previewUrl = photo?.url ?? null;
  useEffect(() => {
    return () => {
      if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!features.photoScan) {
    return (
      <section className={styles.page}>
        <Link to="/scan" className={styles.back}>
          {t('scan.back')}
        </Link>
        <h1>{t('scan.photoTitle')}</h1>
        <p role="status">{t('scan.photoSoon')}</p>
        <Link to="/scan/paste" className={styles.linkButton}>
          {t('scan.pasteLink')}
        </Link>
      </section>
    );
  }

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setStatus('preparing');
    const resized = await resizeImage(file, imageDeps);
    setStatus('idle');
    if (!resized.ok) {
      setError(`scan.photoError.${resized.error.code}`);
      return;
    }
    setPhoto({ blob: resized.value, url: URL.createObjectURL(resized.value) });
  };

  const read = async () => {
    if (!photo) return;
    setError(null);
    setStatus('reading');
    const result = await labelReader.analyze(photo.blob);
    setStatus('idle');
    if (!result.ok) {
      setError(`scan.photoError.${result.error.code}`);
      return;
    }
    const { value } = result;
    navigate('/scan/review', {
      state: {
        text: value.ingredientsText,
        source: 'photo',
        name: value.productName,
        brand: value.brand,
        categoryGuess: value.categoryGuess,
        confidence: value.confidence,
        photo: photo.blob,
      },
    });
  };

  const recognize = () => {
    if (!consent.granted) {
      setAsking(true);
      return;
    }
    void read();
  };

  const agree = () => {
    store.getState().actions.settings.update({
      consents: { photoToAi: { granted: true, at: new Date(clock.now()).toISOString() } },
    });
    setAsking(false);
    void read();
  };

  const decline = () => {
    setAsking(false);
    navigate('/scan/paste');
  };

  const busy = status !== 'idle';

  return (
    <section className={styles.page}>
      <Link to="/scan" className={styles.back}>
        {t('scan.back')}
      </Link>
      <h1>{t('scan.photoTitle')}</h1>
      <p>{t('scan.photoIntro')}</p>

      <section className={styles.section} aria-label={t('scan.photoTipsTitle')}>
        <h2>{t('scan.photoTipsTitle')}</h2>
        <ul>
          {TIPS.map((tip) => (
            <li key={tip}>{t(tip)}</li>
          ))}
        </ul>
      </section>

      <div className={styles.actions}>
        {/* the real file fields are hidden; the label is the button (a touch target) */}
        <label className={styles.fileButton}>
          {t('scan.photoCamera')}
          <input
            className={styles.fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(event) => void pick(event)}
          />
        </label>
        <label className={styles.fileButton}>
          {t('scan.photoGallery')}
          <input
            className={styles.fileInput}
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(event) => void pick(event)}
          />
        </label>
      </div>

      {status === 'preparing' ? <p role="status">{t('scan.photoPreparing')}</p> : null}
      {status === 'reading' ? <p role="status">{t('scan.photoReading')}</p> : null}

      {photo ? (
        <>
          <PhotoPreview src={photo.url} alt={t('scan.photoPreviewAlt')} />
          <Button disabled={busy} onClick={recognize}>
            {error ? t('scan.photoRetry') : t('scan.photoRecognize')}
          </Button>
        </>
      ) : null}

      {error ? (
        <div role="alert" className={styles.section}>
          <p>{t(error)}</p>
          <Link to="/scan/paste" className={styles.linkButton}>
            {t('scan.photoManual')}
          </Link>
        </div>
      ) : null}

      {asking ? <ConsentDialog onAgree={agree} onDecline={decline} /> : null}
    </section>
  );
}
