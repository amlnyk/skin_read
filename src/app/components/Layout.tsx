import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { Background } from '@/ui';
import { ErrorBoundary } from './ErrorBoundary';
import styles from './Layout.module.css';
import { TabIcon, type TabIconName } from './TabIcon';

type Tab = { to: string; labelKey: MessageKey; end: boolean; icon: TabIconName };

const tabs: readonly Tab[] = [
  { to: '/', labelKey: 'nav.home', end: true, icon: 'home' },
  { to: '/care', labelKey: 'nav.care', end: false, icon: 'care' },
  { to: '/scan', labelKey: 'nav.scan', end: false, icon: 'scan' },
  { to: '/reference', labelKey: 'nav.reference', end: false, icon: 'reference' },
  { to: '/profile', labelKey: 'nav.profile', end: false, icon: 'profile' },
];

export function Layout() {
  return (
    <Background variant="sheet">
      <div className={styles.shell}>
        <main className={styles.main}>
          <ErrorBoundary>
            <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <nav className={styles.nav} aria-label={t('nav.label')}>
          <ul className={styles.list}>
            {tabs.map((tab) => (
              <li key={tab.to} className={styles.item}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    isActive ? `${styles.link} ${styles.active}` : styles.link
                  }
                >
                  {t(tab.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Background>
  );
}
