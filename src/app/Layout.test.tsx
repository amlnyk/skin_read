import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Layout } from './Layout';

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

    const nav = screen.getByRole('navigation', { name: 'Основна навігація' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.textContent)).toEqual([
      'Головна',
      'Мій догляд',
      'Сканер',
      'Довідник',
      'Профіль',
    ]);
    expect(within(nav).getByRole('link', { name: 'Головна' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
