import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, CONTENT_UPDATED_AT, CONTENT_VERSION } from '../version';

describe('version.json', () => {
  it('has a semantic app version equal to package.json', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('has a semantic content version and an ISO date', () => {
    expect(CONTENT_VERSION).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
    expect(CONTENT_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(CONTENT_UPDATED_AT))).toBe(false);
  });
});
