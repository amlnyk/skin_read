export type ContentPolicy = 'demo' | 'public';

export const appConfig = {
  appName: 'Skin Barrier',
  // 'demo' shows verified + draft content, 'public' shows verified only.
  CONTENT_POLICY: 'demo' as ContentPolicy,
  schemaVersion: 1,
} as const;
