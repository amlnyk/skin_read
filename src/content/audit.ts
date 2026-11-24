import type { ReviewStatus } from '@/schemas';
import { CONTENT_FILES, SINGLE_RECORD_FILES } from './files';
import { parseContentFiles } from './loader';

// Pure functions of the content audit. The script scripts/content-audit.ts only reads files,
// prints the report, writes CONTENT_TODO.md and sets the exit code.

export type StatusCounts = Record<ReviewStatus, number>;

export type NonVerifiedRecord = { id: string; status: ReviewStatus };

export type FileAudit = {
  file: string;
  counts: StatusCounts;
  total: number;
  nonVerified: NonVerifiedRecord[];
};

export type AuditReport = {
  files: FileAudit[];
  totals: StatusCounts;
  /** Schema errors, duplicate ids, duplicate aliases, dangling references. */
  errors: string[];
};

const emptyCounts = (): StatusCounts => ({ placeholder: 0, draft: 0, verified: 0 });

type AnyRecord = { id: string; reviewStatus: ReviewStatus };

function auditRecords(file: string, records: readonly AnyRecord[], errors: string[]): FileAudit {
  const counts = emptyCounts();
  const nonVerified: NonVerifiedRecord[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    counts[record.reviewStatus] += 1;
    if (record.reviewStatus !== 'verified') {
      nonVerified.push({ id: record.id, status: record.reviewStatus });
    }
    if (seen.has(record.id)) errors.push(`${file}: duplicate id "${record.id}"`);
    seen.add(record.id);
  }
  return { file, counts, total: records.length, nonVerified };
}

export function auditContent(raw: Readonly<Record<string, unknown>>): AuditReport {
  const errors: string[] = [];
  const files: FileAudit[] = [];

  const parsed = parseContentFiles(raw);
  if (!parsed.ok) {
    errors.push(`${parsed.error.file}: field "${parsed.error.path}": ${parsed.error.message}`);
  } else {
    const bundle = parsed.value;
    for (const entry of CONTENT_FILES) {
      files.push(auditRecords(entry.file, bundle[entry.key], errors));
    }

    // Referential integrity.
    const groupIds = new Set(bundle.ingredientGroups.map((g) => g.id));
    const ingredientIds = new Set(bundle.ingredients.map((i) => i.id));
    for (const ingredient of bundle.ingredients) {
      for (const group of ingredient.groups) {
        if (!groupIds.has(group)) {
          errors.push(`ingredients.json: "${ingredient.id}" refers to unknown group "${group}"`);
        }
      }
      for (const other of ingredient.knownInteractions) {
        if (!ingredientIds.has(other)) {
          errors.push(
            `ingredients.json: "${ingredient.id}" refers to unknown ingredient "${other}"`,
          );
        }
      }
    }
    for (const rule of bundle.compatRules) {
      for (const ref of [rule.a, rule.b]) {
        const known = ref.kind === 'ingredient' ? ingredientIds : groupIds;
        if (!known.has(ref.id)) {
          errors.push(`compat-rules.json: "${rule.id}" refers to unknown ${ref.kind} "${ref.id}"`);
        }
      }
    }

    // Aliases must be unique across ingredients (case-insensitive), including the INCI name.
    const owners = new Map<string, string>();
    for (const ingredient of bundle.ingredients) {
      for (const name of [ingredient.inci, ...ingredient.aliases]) {
        const key = name.trim().toLowerCase();
        const owner = owners.get(key);
        if (owner !== undefined && owner !== ingredient.id) {
          errors.push(
            `ingredients.json: name "${name}" is used by "${owner}" and "${ingredient.id}"`,
          );
        }
        owners.set(key, ingredient.id);
      }
    }
  }

  for (const entry of SINGLE_RECORD_FILES) {
    const result = entry.schema.safeParse(raw[entry.file]);
    if (!result.success) {
      const issue = result.error.issues[0];
      errors.push(
        `${entry.file}: field "${issue ? issue.path.join('.') : ''}": ${issue ? issue.message : 'invalid'}`,
      );
    } else {
      files.push(auditRecords(entry.file, [result.data], errors));
    }
  }

  const totals = emptyCounts();
  for (const file of files) {
    for (const status of ['placeholder', 'draft', 'verified'] as const) {
      totals[status] += file.counts[status];
    }
  }
  return { files, totals, errors };
}

export function hasNonVerified(report: AuditReport): boolean {
  return report.totals.placeholder > 0 || report.totals.draft > 0;
}

export function formatReport(report: AuditReport): string {
  const lines = report.files.map(
    (f) =>
      `${f.file}: placeholder ${f.counts.placeholder}, draft ${f.counts.draft}, verified ${f.counts.verified}`,
  );
  lines.push(
    '',
    `placeholder: ${report.totals.placeholder}, draft: ${report.totals.draft}, verified: ${report.totals.verified}`,
  );
  for (const error of report.errors) lines.push(`ERROR: ${error}`);
  return lines.join('\n');
}

export const TODO_START = '<!-- content-audit:start -->';
export const TODO_END = '<!-- content-audit:end -->';

/** Markdown for the generated section of CONTENT_TODO.md (placeholder and draft records). */
export function renderTodoSection(report: AuditReport): string {
  const lines = [
    TODO_START,
    '## Записи, що чекають наповнення або затвердження (створено автоматично)',
    '',
    'Список оновлює `npm run content:audit`. Вручну цей розділ не редагуй.',
    '',
  ];
  for (const status of ['placeholder', 'draft'] as const) {
    lines.push(`### ${status}`, '');
    const items = report.files.flatMap((f) =>
      f.nonVerified.filter((r) => r.status === status).map((r) => `- ${f.file}: ${r.id}`),
    );
    lines.push(...(items.length > 0 ? items : ['- немає']), '');
  }
  lines.push(TODO_END);
  return lines.join('\n');
}

/** Replaces the generated section, or appends it when the markers are not there yet. */
export function replaceTodoSection(todo: string, section: string): string {
  const start = todo.indexOf(TODO_START);
  const end = todo.indexOf(TODO_END);
  if (start !== -1 && end !== -1 && end > start) {
    return todo.slice(0, start) + section + todo.slice(end + TODO_END.length);
  }
  return `${todo.replace(/\s*$/, '')}\n\n${section}\n`;
}
