import { describe, expect, it } from 'vitest';
import raw from '@fixtures/content-raw.json';
import {
  auditContent,
  formatReport,
  hasNonVerified,
  renderTodoSection,
  replaceTodoSection,
  TODO_END,
  TODO_START,
} from './audit';

type Raw = Record<string, { items: Record<string, unknown>[] }>;
const clone = () => structuredClone(raw) as unknown as Raw;
const bundledFiles = import.meta.glob('./*.json', { eager: true, import: 'default' });

describe('auditContent', () => {
  it('counts records by review status, the single-record disclaimer included', () => {
    const report = auditContent(raw as Record<string, unknown>);
    expect(report.errors).toEqual([]);
    // ingredients: verified, draft, placeholder; groups: verified, draft; rule: verified;
    // disclaimer: verified
    expect(report.totals).toEqual({ placeholder: 1, draft: 2, verified: 4 });
    expect(hasNonVerified(report)).toBe(true);
  });

  it('reports a duplicate id', () => {
    const broken = clone();
    broken['ingredient-groups.json']!.items.push({ ...broken['ingredient-groups.json']!.items[0] });
    const report = auditContent(broken);
    expect(report.errors.some((e) => e.includes('duplicate id "group-v"'))).toBe(true);
  });

  it('reports an ingredient that refers to an unknown group', () => {
    const broken = clone();
    broken['ingredients.json']!.items[0]!.groups = ['no-such-group'];
    const report = auditContent(broken);
    expect(report.errors.some((e) => e.includes('unknown group "no-such-group"'))).toBe(true);
  });

  it('reports a rule that refers to an unknown ingredient', () => {
    const broken = clone();
    broken['compat-rules.json']!.items[0]!.a = { kind: 'ingredient', id: 'ghost' };
    const report = auditContent(broken);
    expect(report.errors.some((e) => e.includes('unknown ingredient "ghost"'))).toBe(true);
  });

  it('reports an alias used by two ingredients (case-insensitive)', () => {
    const broken = clone();
    broken['ingredients.json']!.items[1]!.aliases = ['TEST ALIAS'];
    const report = auditContent(broken);
    expect(report.errors.some((e) => e.includes('"TEST ALIAS" is used by'))).toBe(true);
  });

  it('reports a schema error with file and field', () => {
    const broken = clone();
    broken['ingredients.json']!.items[0]!.reviewStatus = 'maybe';
    const report = auditContent(broken);
    expect(report.errors[0]).toContain('ingredients.json');
    expect(report.errors[0]).toContain('items.0.reviewStatus');
  });

  it('reports a broken disclaimer', () => {
    const report = auditContent({ ...(raw as Record<string, unknown>), 'disclaimer.json': {} });
    expect(report.errors.some((e) => e.startsWith('disclaimer.json'))).toBe(true);
  });

  it('the real content files of this stage have no errors', () => {
    const files: Record<string, unknown> = {};
    for (const [path, value] of Object.entries(bundledFiles)) files[path.replace('./', '')] = value;
    const report = auditContent(files);
    expect(report.errors).toEqual([]);
    expect(report.totals.verified).toBe(0);
  });
});

describe('formatReport', () => {
  it('prints the totals line in the agreed format', () => {
    const text = formatReport(auditContent(raw as Record<string, unknown>));
    expect(text).toContain('placeholder: 1, draft: 2, verified: 4');
    expect(text).toContain('ingredients.json: placeholder 1, draft 1, verified 1');
  });

  it('prints errors', () => {
    const broken = clone();
    broken['ingredients.json']!.items[0]!.groups = ['ghost'];
    expect(formatReport(auditContent(broken))).toContain('ERROR:');
  });
});

describe('CONTENT_TODO.md section', () => {
  const section = renderTodoSection(auditContent(raw as Record<string, unknown>));

  it('lists placeholder and draft records between the markers', () => {
    expect(section.startsWith(TODO_START)).toBe(true);
    expect(section.endsWith(TODO_END)).toBe(true);
    expect(section).toContain('- ingredients.json: ing-p');
    expect(section).toContain('- ingredients.json: ing-d');
    expect(section).not.toContain('ing-v');
  });

  it('is appended when the markers are missing', () => {
    const result = replaceTodoSection('# TODO\n\nmanual text\n', section);
    expect(result).toContain('manual text');
    expect(result).toContain(TODO_START);
  });

  it('replaces only the generated part when the markers exist', () => {
    const once = replaceTodoSection('# TODO\n\nmanual text\n', section);
    const twice = replaceTodoSection(once, renderTodoSection(auditContent(clone())));
    expect(twice.match(new RegExp(TODO_START, 'g'))).toHaveLength(1);
    expect(twice).toContain('manual text');
  });
});
