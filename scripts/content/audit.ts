// Content audit. Usage:
//   npm run content:audit                    prints counts per file, updates CONTENT_TODO.md
//   npm run content:audit -- --strict        also exits with code 1 if any record is not 'verified'
//   npm run content:audit -- --no-write      does not touch CONTENT_TODO.md (used by `npm run check`)
// Schema errors, duplicate ids and broken references always give exit code 1.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditContent,
  formatReport,
  hasNonVerified,
  renderTodoSection,
  replaceTodoSection,
} from '../../src/content/audit';
import { CONTENT_FILES, SINGLE_RECORD_FILES } from '../../src/content/files';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const contentDir = join(root, 'src', 'content', 'data');
const args = new Set(process.argv.slice(2));

const raw: Record<string, unknown> = {};
for (const { file } of [...CONTENT_FILES, ...SINGLE_RECORD_FILES]) {
  const path = join(contentDir, file);
  if (!existsSync(path)) continue;
  try {
    raw[file] = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error(`ERROR: ${file} is not valid JSON`);
    process.exit(1);
  }
}

const report = auditContent(raw);
console.log(formatReport(report));

if (!args.has('--no-write')) {
  const todoPath = join(root, 'CONTENT_TODO.md');
  const current = existsSync(todoPath) ? readFileSync(todoPath, 'utf8') : '# CONTENT_TODO\n';
  const next = replaceTodoSection(current, renderTodoSection(report));
  if (next !== current) {
    writeFileSync(todoPath, next, 'utf8');
    console.log('CONTENT_TODO.md updated');
  }
}

if (report.errors.length > 0) process.exit(1);
if (args.has('--strict') && hasNonVerified(report)) {
  console.error('STRICT: there are records that are not verified');
  process.exit(1);
}
