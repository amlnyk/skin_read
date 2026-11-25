import { z } from 'zod';
import { contentBundleSchema } from '@/schemas';
import type { ContentBundle, ContentPolicy } from '@/schemas';
import type { ContentProvider } from '@/types';
import { CONTENT_FILES } from './files';
import { applyContentPolicy } from './policy';
import { CONTENT_VERSION } from './version';

// Results are values, not exceptions (see the Result type in lib). The content layer may not
// import lib, so this tiny local shape is used instead.
export type ContentLoadError = {
  /** File name, for example 'ingredients.json'. */
  readonly file: string;
  /** Path of the broken field inside the file, for example 'items.0.reviewStatus'. */
  readonly path: string;
  readonly message: string;
};

export type ContentLoadResult =
  | { readonly ok: true; readonly value: ContentProvider }
  | { readonly ok: false; readonly error: ContentLoadError };

export type ParseResult =
  | { readonly ok: true; readonly value: ContentBundle }
  | { readonly ok: false; readonly error: ContentLoadError };

const containerSchema = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

/** Validates all container files with zod. No policy is applied (the audit needs everything). */
export function parseContentFiles(raw: Readonly<Record<string, unknown>>): ParseResult {
  const collected: Record<string, unknown> = {};
  for (const entry of CONTENT_FILES) {
    const parsed = containerSchema(entry.schema).safeParse(raw[entry.file]);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: {
          file: entry.file,
          path: issue ? issue.path.join('.') : '',
          message: issue ? issue.message : 'Invalid file',
        },
      };
    }
    collected[entry.key] = parsed.data.items;
  }
  const bundle = contentBundleSchema.safeParse(collected);
  if (!bundle.success) {
    return { ok: false, error: { file: '(bundle)', path: '', message: bundle.error.message } };
  }
  return { ok: true, value: bundle.data };
}

export function loadContent(
  raw: Readonly<Record<string, unknown>>,
  policy: ContentPolicy,
): ContentLoadResult {
  const parsed = parseContentFiles(raw);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: { policy, version: CONTENT_VERSION, bundle: applyContentPolicy(parsed.value, policy) },
  };
}

export function describeContentError(error: ContentLoadError): string {
  return `Content error in ${error.file}, field "${error.path}": ${error.message}`;
}
