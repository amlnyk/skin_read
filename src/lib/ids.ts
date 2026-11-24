import type { IdGenerator } from './ports';

type RandomSource = Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>;

// crypto.randomUUID exists only in secure contexts (HTTPS or localhost).
// Over plain http on a phone in the local network it is missing, so there is a fallback
// that builds a UUID v4 from getRandomValues, which works everywhere.
export function createCryptoIdGenerator(source: RandomSource = globalThis.crypto): IdGenerator {
  return {
    next() {
      if (typeof source.randomUUID === 'function') {
        return source.randomUUID();
      }
      const bytes = source.getRandomValues(new Uint8Array(16));
      bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
      bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
      ].join('-');
    },
  };
}
