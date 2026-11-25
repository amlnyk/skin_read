import { describe, expect, it } from 'vitest';
import { createCryptoIdGenerator } from '../ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createCryptoIdGenerator', () => {
  it('uses randomUUID when it exists', () => {
    const ids = createCryptoIdGenerator({
      getRandomValues: crypto.getRandomValues.bind(crypto),
      randomUUID: () => '11111111-1111-4111-8111-111111111111',
    });
    expect(ids.next()).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('falls back to a valid v4 UUID without randomUUID (plain http)', () => {
    const ids = createCryptoIdGenerator({ getRandomValues: crypto.getRandomValues.bind(crypto) });
    const first = ids.next();
    expect(first).toMatch(UUID_V4);
    expect(ids.next()).not.toBe(first);
  });

  it('works with the default global crypto', () => {
    expect(createCryptoIdGenerator().next()).toMatch(UUID_V4);
  });
});
