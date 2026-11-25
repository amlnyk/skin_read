import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The folder rules of docs/architecture/ARCHITECTURE.md, section 3: files of different kinds
// are not mixed in one folder. A new file in the wrong place fails here.

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full).split('\\').join('/'));
  }
  return out;
}

const entries = (dir: string) => readdirSync(join(ROOT, dir));
const isDir = (path: string) => statSync(join(ROOT, path)).isDirectory();

describe('folder structure', () => {
  it('keeps every test in a __tests__ folder', () => {
    const misplaced = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'api'))].filter(
      (file) => /\.test\.tsx?$/.test(file) && !file.includes('/__tests__/'),
    );
    expect(misplaced).toEqual([]);
  });

  it('keeps only index.ts, README.md and known folders in the root of a feature', () => {
    const folders = new Set(['pages', 'components', 'hooks', 'utils', 'styles', '__tests__']);
    const wrong: string[] = [];
    for (const feature of entries('src/features')) {
      for (const name of entries(`src/features/${feature}`)) {
        const path = `src/features/${feature}/${name}`;
        const ok = isDir(path) ? folders.has(name) : ['index.ts', 'README.md'].includes(name);
        if (!ok) wrong.push(path);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('keeps content data only in src/content/data', () => {
    expect(entries('src/content').filter((name) => name.endsWith('.json'))).toEqual([]);
    expect(entries('src/content/data').filter((name) => !name.endsWith('.json'))).toEqual([]);
  });

  it('keeps documents in docs subfolders and scripts in scripts subfolders', () => {
    expect(
      entries('docs').filter((name) => !isDir(`docs/${name}`) && name !== 'README.md'),
    ).toEqual([]);
    expect(entries('scripts').filter((name) => !isDir(`scripts/${name}`))).toEqual([]);
  });
});
