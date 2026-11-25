import { describe, expect, it } from 'vitest';
import { createMemoryBackend, createPhotoStore, type KeyValueBackend } from './photoStore';

const blob = (text: string) => new Blob([text], { type: 'image/jpeg' });

const failing = (name: string, message = 'x'): KeyValueBackend => {
  const fail = () => {
    const error = new Error(message);
    error.name = name;
    return Promise.reject(error);
  };
  return { get: fail, set: fail, del: fail, keys: fail, clear: fail };
};

describe('the photo store', () => {
  it('keeps a photo under the id of the product and gives it back', async () => {
    const store = createPhotoStore(createMemoryBackend());
    expect((await store.put('p1', blob('abc'))).ok).toBe(true);
    const got = await store.get('p1');
    expect(got.ok && got.value?.size).toBe(3);
  });

  it('no photo is null, not an error', async () => {
    const store = createPhotoStore(createMemoryBackend());
    expect(await store.get('none')).toEqual({ ok: true, value: null });
  });

  it('removes one photo and leaves the others', async () => {
    const store = createPhotoStore(createMemoryBackend());
    await store.put('p1', blob('a'));
    await store.put('p2', blob('b'));
    await store.remove('p1');
    expect(await store.keys()).toEqual({ ok: true, value: ['p2'] });
  });

  it('a second photo under the same id replaces the first', async () => {
    const store = createPhotoStore(createMemoryBackend());
    await store.put('p1', blob('a'));
    await store.put('p1', blob('abcd'));
    const got = await store.get('p1');
    expect(got.ok && got.value?.size).toBe(4);
    expect(await store.keys()).toEqual({ ok: true, value: ['p1'] });
  });

  it('retainOnly deletes every photo that is not in the list', async () => {
    const store = createPhotoStore(createMemoryBackend());
    for (const id of ['a', 'b', 'c']) await store.put(id, blob(id));
    expect((await store.retainOnly(['b', 'zzz'])).ok).toBe(true);
    expect(await store.keys()).toEqual({ ok: true, value: ['b'] });
  });

  it('retainOnly with an empty list deletes all', async () => {
    const store = createPhotoStore(createMemoryBackend());
    await store.put('a', blob('a'));
    await store.retainOnly([]);
    expect(await store.keys()).toEqual({ ok: true, value: [] });
  });

  it('clear deletes all', async () => {
    const store = createPhotoStore(createMemoryBackend());
    await store.put('a', blob('a'));
    await store.put('b', blob('b'));
    await store.clear();
    expect(await store.keys()).toEqual({ ok: true, value: [] });
  });

  it('a failing storage is a value with a code, never an exception', async () => {
    const quota = createPhotoStore(failing('QuotaExceededError'));
    expect(await quota.put('a', blob('a'))).toEqual({ ok: false, error: { code: 'quota' } });

    const blocked = createPhotoStore(failing('SecurityError'));
    expect(await blocked.get('a')).toEqual({ ok: false, error: { code: 'unavailable' } });

    const odd = createPhotoStore(failing('Error'));
    expect(await odd.keys()).toEqual({ ok: false, error: { code: 'unknown' } });
    expect(await odd.clear()).toEqual({ ok: false, error: { code: 'unknown' } });
    expect(await odd.remove('a')).toEqual({ ok: false, error: { code: 'unknown' } });
    expect(await odd.retainOnly([])).toEqual({ ok: false, error: { code: 'unknown' } });
  });

  it('no IndexedDB at all (ReferenceError) is "unavailable"', async () => {
    const backend: KeyValueBackend = {
      ...createMemoryBackend(),
      keys: () => Promise.reject(new ReferenceError('indexedDB is not defined')),
    };
    expect(await createPhotoStore(backend).keys()).toEqual({
      ok: false,
      error: { code: 'unavailable' },
    });
  });
});
