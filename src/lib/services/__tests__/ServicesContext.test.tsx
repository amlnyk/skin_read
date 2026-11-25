import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestServices } from '@/test/helpers/fakes';
import { ServicesProvider, useServices } from '../index';

function Probe() {
  const { ids } = useServices();
  return <p>{ids.next()}</p>;
}

describe('ServicesProvider', () => {
  it('gives components the injected (fake) services', () => {
    render(
      <ServicesProvider services={createTestServices()}>
        <Probe />
      </ServicesProvider>,
    );
    expect(screen.getByText('id-1')).toBeInTheDocument();
  });

  it('throws a clear error when used without a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useServices must be used inside <ServicesProvider>');
    spy.mockRestore();
  });
});
