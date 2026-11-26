import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { Background } from '@/ui';
import styles from './AnalysisLoader.module.css';

const DURATION_MS = 1600;

/** False when the browser cannot animate or the person asked for reduced motion. */
export function canAnimate(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Props = { onDone: () => void };

// Figma 01_analise: a glowing purple line and a big percent counting up. The profile itself is
// computed instantly on the device; this is a short pause, not a real progress of a server job.
export function AnalysisLoader({ onDone }: Props) {
  const [percent, setPercent] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let frame = 0;
    let start: number | null = null;
    const tick = (time: number) => {
      start ??= time;
      const share = Math.min((time - start) / DURATION_MS, 1);
      // ease-out: fast at first, slower near 100
      setPercent(Math.round((1 - (1 - share) ** 3) * 100));
      if (share < 1) frame = requestAnimationFrame(tick);
      else done.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Background variant="analysis">
      <main className={styles.page}>
        <div
          className={styles.meter}
          role="progressbar"
          aria-label={t('test.analysing')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <progress className={styles.line} value={percent} max={100} aria-hidden="true" />
          <p className={styles.percent} aria-hidden="true">
            {percent}
            <span className={styles.unit}>%</span>
          </p>
        </div>
      </main>
    </Background>
  );
}
