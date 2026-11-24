import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { HomePage } from './pages/HomePage';

describe('HomePage', () => {
  it('has the medical disclaimer and a link to the test', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('note', { name: t('disclaimer.label') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.startTest') })).toHaveAttribute(
      'href',
      '/test',
    );
  });
});
