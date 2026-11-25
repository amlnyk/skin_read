import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { Layout } from '../components/Layout';

describe('Layout', () => {
  it('renders 5 bottom navigation tabs and marks the active one', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>stub</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.textContent)).toEqual([
      t('nav.home'),
      t('nav.care'),
      t('nav.scan'),
      t('nav.reference'),
      t('nav.profile'),
    ]);
    expect(within(nav).getByRole('link', { name: t('nav.home') })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
