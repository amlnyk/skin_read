import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseEnv } from '@/lib/env';
import { createTestContent } from '@/test/helpers/fakes';
import { createComposition, createServices } from '../compositionRoot';

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
    const services = createServices(envFor('development'), createTestContent());
    expect(services.clock.now()).toBeGreaterThan(0);
    expect(services.ids.next()).not.toBe(services.ids.next());
    services.storage.setItem('skinbarrier:composition-test', 'ok');
    expect(services.storage.getItem('skinbarrier:composition-test')).toEqual({
      ok: true,
      value: 'ok',
    });
    services.storage.removeItem('skinbarrier:composition-test');
  });

  it('has the photo services, and the photo switch follows the env', () => {
    const off = createServices(envFor('development'), createTestContent());
    expect(typeof off.labelReader.analyze).toBe('function');
    expect(typeof off.photos.put).toBe('function');
    expect(typeof off.imageDeps.decode).toBe('function');
    expect(off.features.photoScan).toBe(false);

    const parsed = parseEnv({ VITE_APP_ENV: 'development', VITE_FEATURE_PHOTO_SCAN: 'true' });
    if (!parsed.ok) throw new Error('test env must be valid');
    expect(createServices(parsed.value, createTestContent()).features.photoScan).toBe(true);
  });

  it('passes the loaded content to the services', () => {
    const content = createTestContent({ version: 'from-test' });
    expect(createServices(envFor('development'), content).content).toBe(content);
  });

  it('createComposition builds a store that saves through services.storage', () => {
    const { services, store } = createComposition(envFor('development'), createTestContent());
    store.getState().actions.onboarding.complete();
    const saved = services.storage.getItem('skinbarrier:v1');
    expect(saved.ok && saved.value).toContain('"completed":true');
    services.storage.removeItem('skinbarrier:v1');
  });

  it('production logger drops info but keeps warn', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const services = createServices(envFor('production'), createTestContent());
    services.logger.info('hidden');
    services.logger.warn('shown');
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('shown');
  });

  it('development logger passes info', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    createServices(envFor('development'), createTestContent()).logger.info('shown');
    expect(info).toHaveBeenCalledWith('shown');
  });
});
