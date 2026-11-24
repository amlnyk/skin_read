import { NavLink, Outlet } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import styles from './Layout.module.css';

const tabs = [
  { to: '/', label: 'Головна', end: true },
  { to: '/care', label: 'Мій догляд', end: false },
  { to: '/scan', label: 'Сканер', end: false },
  { to: '/reference', label: 'Довідник', end: false },
  { to: '/profile', label: 'Профіль', end: false },
] as const;

export function Layout() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <nav className={styles.nav} aria-label="Основна навігація">
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
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
