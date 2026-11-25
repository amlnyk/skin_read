import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards for the design tokens (stage 13). The rules come from the plan:
// nothing bypasses tokens.css, text is at least 16px, contrast is AA, tap targets are 44px.

const SRC = join(process.cwd(), 'src');
const TOKENS = join(SRC, 'styles', 'tokens.css');

// Places that may hold a raw color or size. Every entry needs a reason.
const COLOR_EXCEPTIONS = new Set([
  'lib/image/browserImage.ts', // white canvas background: image data, not interface color
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return relative(SRC, file).split('\\').join('/');
}

const tokensCss = readFileSync(TOKENS, 'utf8');

function token(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(tokensCss);
  if (!match?.[1]) throw new Error(`token ${name} not found`);
  return match[1].trim();
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('tokens: nothing bypasses tokens.css', () => {
  const sources = walk(SRC).filter(
    (file) => /\.(css|ts|tsx)$/.test(file) && file !== TOKENS && !/\.test\.tsx?$/.test(file),
  );

  it('has no raw colors outside tokens.css (except the documented places)', () => {
    const offenders: string[] = [];
    for (const file of sources) {
      if (COLOR_EXCEPTIONS.has(rel(file))) continue;
      const text = readFileSync(file, 'utf8');
      if (/#[0-9a-fA-F]{3,8}\b/.test(text) || /\brgba?\(|\bhsla?\(/.test(text))
        offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });

  it('has no inline color styles in components', () => {
    const offenders = sources
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => /style=\{\{[^}]*(color|background)/i.test(readFileSync(file, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('takes every font size from a token', () => {
    const offenders: string[] = [];
    for (const file of sources.filter((f) => f.endsWith('.css'))) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/font-size:\s*([^;]+);/g)) {
        if (!/^var\(--font-size-(sm|md|lg)\)$/.test(match[1]!.trim()))
          offenders.push(`${rel(file)}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('tokens: accessibility numbers', () => {
  it('keeps the smallest text size at 16px or more', () => {
    for (const name of ['--font-size-sm', '--font-size-md', '--font-size-lg']) {
      const value = token(name);
      expect(value.endsWith('rem')).toBe(true);
      expect(parseFloat(value)).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the tap target at 44px or more', () => {
    expect(parseInt(token('--tap-target'), 10)).toBeGreaterThanOrEqual(44);
  });

  const surfaces = ['--color-bg', '--color-surface', '--color-notice-bg'];

  it.each(surfaces)('text and muted text have AA contrast (4.5:1) on %s', (surface) => {
    expect(contrast(token('--color-text'), token(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-text-muted'), token(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-primary'), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['--color-bg', '--color-surface'])(
    'control borders and focus have 3:1 on %s',
    (surface) => {
      expect(contrast(token('--color-control-border'), token(surface))).toBeGreaterThanOrEqual(3);
      expect(contrast(token('--color-focus'), token(surface))).toBeGreaterThanOrEqual(3);
    },
  );
});
