import { t, type MessageKey } from '@/i18n';
import { Background, type BackgroundVariant, Logo } from '@/ui';
import styles from './DesignPage.module.css';

// Token names are code identifiers, not interface copy, so they are shown as they are.
const COLORS = [
  ['black', '--color-black'],
  ['purple', '--color-purple'],
  ['purpleText', '--color-link'],
  ['white', '--color-white'],
  ['surface', '--color-surface-muted'],
  ['line', '--color-border'],
  ['divider', '--color-divider'],
  ['textSecondary', '--color-text-secondary'],
  ['textTertiary', '--color-text-muted'],
  ['controlBorder', '--color-control-border'],
  ['hydration', '--color-hydration'],
  ['oil', '--color-oil'],
  ['sensitivity', '--color-sensitivity'],
] as const;

const BACKGROUNDS: ReadonlyArray<readonly [BackgroundVariant, MessageKey]> = [
  ['splash', 'design.bgSplash'],
  ['welcome', 'design.bgWelcome'],
  ['sheet', 'design.bgSheet'],
  ['analysis', 'design.bgAnalysis'],
];

// Review page for the design foundation: every swatch, type style, the logo and the blob
// backgrounds, so the author can compare them with Figma on a phone.
export function DesignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Logo variant="compact" label={t('design.brand')} />
        <h1>{t('design.title')}</h1>
        <p className={styles.secondary}>{t('design.intro')}</p>
      </header>

      <section className={styles.section}>
        <h2>{t('design.colors')}</h2>
        <ul className={styles.swatches}>
          {COLORS.map(([name, token]) => (
            <li key={name} className={styles.swatchItem}>
              <span className={`${styles.swatch} ${styles[name]}`} aria-hidden="true" />
              <span className={styles.swatchName}>{name}</span>
              <code className={styles.token}>{token}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>{t('design.type')}</h2>
        <div className={styles.specimens}>
          <TypeSample spec="Hero · ExtraBold 52" className={styles.hero}>
            {t('design.sampleHero')}
          </TypeSample>
          <TypeSample spec="Title · ExtraBold 32 / 36" className={styles.title}>
            {t('design.sampleTitle')}
          </TypeSample>
          <TypeSample spec="Body · Medium 16 / 22" className={styles.body}>
            {t('design.sampleBody')}
          </TypeSample>
          <TypeSample spec="Option · Medium 17" className={styles.option}>
            {t('design.sampleOption')}
          </TypeSample>
          <TypeSample spec="Option selected · SemiBold 17" className={styles.optionSelected}>
            {t('design.sampleOptionSelected')}
          </TypeSample>
          <TypeSample spec="Footnote · Regular 13 / 18" className={styles.footnote}>
            {t('design.sampleFootnote')}
          </TypeSample>
          <TypeSample spec="Link · Medium 15" className={styles.link}>
            {t('design.sampleLink')}
          </TypeSample>
          <TypeSample spec="Caption · Medium 12, CAPS" className={styles.caption}>
            {t('design.sampleCaption')}
          </TypeSample>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t('design.logo')}</h2>
        <div className={styles.logos}>
          <Logo variant="full" label={t('design.brand')} />
          <Logo variant="compact" label={t('design.brand')} />
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t('design.backgrounds')}</h2>
        <ul className={styles.frames}>
          {BACKGROUNDS.map(([variant, label]) => (
            <li key={variant} className={styles.frameItem}>
              <div className={styles.frameBox}>
                <div className={styles.frame}>
                  <Background variant={variant} />
                </div>
              </div>
              <span className={styles.secondary}>{t(label)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function TypeSample({
  spec,
  className,
  children,
}: {
  spec: string;
  className: string;
  children: string;
}) {
  return (
    <div className={styles.sample}>
      <code className={styles.token}>{spec}</code>
      <p className={className}>{children}</p>
    </div>
  );
}
