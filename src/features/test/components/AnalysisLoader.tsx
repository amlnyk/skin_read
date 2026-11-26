import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { Background } from '@/ui';
import styles from './AnalysisLoader.module.css';

const DURATION_MS = 2400;
const STRIP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

/** False when the browser cannot animate or the person asked for reduced motion. */
export function canAnimate(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** One digit window: a strip 0-9 that rolls to a fractional position, like an odometer. */
function Digit({ position }: { position: number }) {
  return (
    <span className={styles.window}>
      <span className={styles.strip} style={{ transform: `translateY(${-position}em)` }}>
        {STRIP.map((digit, index) => (
          <span key={index} className={styles.digit}>
            {digit}
          </span>
        ))}
      </span>
    </span>
  );
}

type Props = { onDone: () => void };

// Figma 01_analise, animated as a scanner: the digits roll like counters while a purple
// beam sweeps over them, from 0 to 100. The profile itself is computed instantly on the device;
// this is a short pause, not a real progress of a server job.
export function AnalysisLoader({ onDone }: Props) {
  const [value, setValue] = useState(0);
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
      // ease-in-out: the counter speeds up, then settles on 100
      const eased = share < 0.5 ? 4 * share ** 3 : 1 - (-2 * share + 2) ** 3 / 2;
      setValue(eased * 100);
      if (share < 1) frame = requestAnimationFrame(tick);
      else done.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Odometer: the ones roll ten times faster than the tens; 100 shows a "1" in front.
  const ones = value % 10;
  const tens = (value / 10) % 10;
  const full = value >= 99.5;

  return (
    <Background variant="analysis" animated>
      <main className={styles.page}>
        <div
          className={styles.meter}
          role="progressbar"
          aria-label={t('test.analysing')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value)}
        >
          <p className={styles.number} aria-hidden="true">
            <span className={full ? styles.hundredsOn : styles.hundredsOff}>
              <Digit position={full ? 1 : 0} />
            </span>
            <Digit position={full ? 0 : tens} />
            <Digit position={full ? 0 : ones} />
            <span className={styles.unit}>{t('test.percentSign')}</span>
            <span className={styles.beam} />
          </p>
        </div>
      </main>
    </Background>
  );
}
