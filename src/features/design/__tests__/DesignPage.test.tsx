import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { DesignPage } from '../index';

describe('DesignPage', () => {
  it('shows every section of the design foundation', () => {
    render(<DesignPage />);
    const sections = ['design.colors', 'design.type', 'design.logo', 'design.backgrounds'] as const;
    for (const key of sections) {
      expect(screen.getByRole('heading', { name: t(key) })).toBeInTheDocument();
    }
    // the compact logo in the header plus both variants in the logo section
    expect(screen.getAllByRole('img', { name: t('design.brand') })).toHaveLength(3);
  });
});
