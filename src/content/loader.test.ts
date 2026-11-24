import { describe, expect, it } from 'vitest';
import raw from '@fixtures/content-raw.json';
import { describeContentError, loadContent, parseContentFiles } from './loader';

const files = raw as Record<string, unknown>;

describe('loadContent', () => {
  it('demo shows verified and draft records, never placeholders', () => {
    const result = loadContent(files, 'demo');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.policy).toBe('demo');
    expect(result.value.bundle.ingredients.map((i) => i.id)).toEqual(['ing-v', 'ing-d']);
    expect(result.value.bundle.ingredientGroups.map((g) => g.id)).toEqual(['group-v', 'group-d']);
  });

  it('public shows verified records only', () => {
    const result = loadContent(files, 'public');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bundle.ingredients.map((i) => i.id)).toEqual(['ing-v']);
    expect(result.value.bundle.ingredientGroups.map((g) => g.id)).toEqual(['group-v']);
  });

  it('parseContentFiles applies no policy (the audit needs every record)', () => {
    const result = parseContentFiles(files);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ingredients).toHaveLength(3);
  });

  it('a missing file is an error that names the file', () => {
    const rest = { ...files };
    delete rest['ingredients.json'];
    const result = loadContent(rest, 'demo');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.file).toBe('ingredients.json');
  });

  it('a broken field is an error that names the file and the path', () => {
    const broken = structuredClone(files) as {
      'ingredients.json': { items: { reviewStatus: string }[] };
    };
    broken['ingredients.json'].items[0]!.reviewStatus = 'maybe';
    const result = loadContent(broken, 'demo');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.file).toBe('ingredients.json');
    expect(result.error.path).toBe('items.0.reviewStatus');
    expect(describeContentError(result.error)).toContain('ingredients.json');
    expect(describeContentError(result.error)).toContain('items.0.reviewStatus');
  });

  it('a container without "items" is rejected', () => {
    const result = loadContent({ ...files, 'conditions.json': [] }, 'demo');
    expect(result.ok).toBe(false);
  });
});
