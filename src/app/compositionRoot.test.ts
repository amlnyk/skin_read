import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseEnv } from '@/lib/env';
import { createServices } from './compositionRoot';

function envFor(appEnv: string) {
  const result = parseEnv({ VITE_APP_ENV: appEnv });
  if (!result.ok) throw new Error('test env must be valid');
  return result.value;
}

describe('createServices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds working real adapters', () => {
    const services = createServices(envFor('development'));
    expect(services.clock.now()).toBeGreaterThan(0);
    expect(services.ids.next()).not.toBe(services.ids.next());
    services.storage.setItem('skinbarrier:composition-test', 'ok');
    expect(services.storage.getItem('skinbarrier:composition-test')).toEqual({
      ok: true,
      value: 'ok',
    });
    services.storage.removeItem('skinbarrier:composition-test');
  });

  it('production logger drops info but keeps warn', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const services = createServices(envFor('production'));
    services.logger.info('hidden');
    services.logger.warn('shown');
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('shown');
  });

  it('development logger passes info', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    createServices(envFor('development')).logger.info('shown');
    expect(info).toHaveBeenCalledWith('shown');
  });
});
