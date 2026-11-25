import type { ContentPolicy } from '@/schemas';
import { loadContent, type ContentLoadResult } from './loader';

// All src/content/data/*.json files, bundled by Vite. Kept apart from loader.ts because
// import.meta.glob exists only inside Vite (the audit script runs in plain Node).
const bundledFiles = import.meta.glob('./data/*.json', { eager: true, import: 'default' });

export function loadBundledContent(policy: ContentPolicy): ContentLoadResult {
  const raw: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(bundledFiles)) {
    raw[path.replace('./data/', '')] = value;
  }
  return loadContent(raw, policy);
}
