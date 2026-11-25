import { describe, expect, it } from 'vitest';
import { createLocalStorageAdapter, createMemoryAdapter } from '../index';

describe('memory adapter', () => {
  it('stores, reads and removes values', () => {
    const adapter = createMemoryAdapter({ a: '1' });
    expect(adapter.getItem('a')).toEqual({ ok: true, value: '1' });
    expect(adapter.getItem('missing')).toEqual({ ok: true, value: null });
    expect(adapter.setItem('b', '2').ok).toBe(true);
    expect(adapter.getItem('b')).toEqual({ ok: true, value: '2' });
    expect(adapter.removeItem('b').ok).toBe(true);
    expect(adapter.getItem('b')).toEqual({ ok: true, value: null });
  });
});

describe('localStorage adapter', () => {
  it('works with the real jsdom localStorage', () => {
    const adapter = createLocalStorageAdapter(window.localStorage);
    adapter.setItem('skinbarrier:test', 'x');
    expect(adapter.getItem('skinbarrier:test')).toEqual({ ok: true, value: 'x' });
    adapter.removeItem('skinbarrier:test');
    expect(adapter.getItem('skinbarrier:test')).toEqual({ ok: true, value: null });
  });

  it('reports unavailable storage as an error value, not an exception', () => {
    const adapter = createLocalStorageAdapter(null);
    expect(adapter.getItem('a')).toEqual({ ok: false, error: { code: 'unavailable' } });
    expect(adapter.setItem('a', 'b')).toEqual({ ok: false, error: { code: 'unavailable' } });
    expect(adapter.removeItem('a')).toEqual({ ok: false, error: { code: 'unavailable' } });
  });

  it('maps a quota error to the quota code and other errors to unknown', () => {
    const quota = new DOMException('full', 'QuotaExceededError');
    const broken = {
      getItem: () => {
        throw new Error('boom');
      },
      setItem: () => {
        throw quota;
      },
      removeItem: () => {
        throw new Error('boom');
      },
    } as unknown as Storage;
    const adapter = createLocalStorageAdapter(broken);
    expect(adapter.setItem('a', 'b')).toEqual({ ok: false, error: { code: 'quota' } });
    expect(adapter.getItem('a')).toEqual({ ok: false, error: { code: 'unknown' } });
    expect(adapter.removeItem('a')).toEqual({ ok: false, error: { code: 'unknown' } });
  });
});
