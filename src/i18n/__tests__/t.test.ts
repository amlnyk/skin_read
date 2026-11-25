import { describe, expect, it } from 'vitest';
import { t } from '../t';
import { uk } from '../uk';

function collectStrings(node: unknown, path: string[] = []): { path: string; value: string }[] {
  if (typeof node === 'string') return [{ path: path.join('.'), value: node }];
  if (typeof node !== 'object' || node === null) return [];
  return Object.entries(node).flatMap(([key, child]) => collectStrings(child, [...path, key]));
}

describe('t', () => {
  it('returns the dictionary text for a key', () => {
    expect(t('nav.home')).toBe(uk.nav.home);
  });

  it('every dictionary entry is a non-empty string and resolvable by its key', () => {
    const entries = collectStrings(uk);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.value.trim()).not.toBe('');
      // The cast is test-only: keys are enumerated at runtime.
      expect(t(entry.path as Parameters<typeof t>[0])).toBe(entry.value);
    }
  });

  it('accepts params and leaves text without placeholders unchanged', () => {
    expect(t('nav.home', { name: 'x' })).toBe(uk.nav.home);
  });

  it('falls back to the key itself for an unknown key at runtime', () => {
    expect(t('nope.nothing' as Parameters<typeof t>[0])).toBe('nope.nothing');
    expect(t('nav' as Parameters<typeof t>[0])).toBe('nav');
  });
});
