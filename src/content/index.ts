import disclaimerFile from './data/disclaimer.json';

export { loadBundledContent } from './bundled';
export { loadContent, describeContentError } from './loader';
export type { ContentLoadError, ContentLoadResult } from './loader';
export { applyContentPolicy, isVisible } from './policy';
export { APP_VERSION, CONTENT_UPDATED_AT, CONTENT_VERSION } from './version';

// The medical disclaimer (a single record shown on several screens). Features take it from here,
// not from the data file, so the place of the file stays an internal detail of this layer.
export const disclaimer = disclaimerFile;
