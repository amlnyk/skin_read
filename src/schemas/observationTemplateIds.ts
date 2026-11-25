// Stable ids of the records in src/content/observation-templates.json.
// The routine analysis names a template by these ids; the content audit checks that every id
// has a record (a placeholder at least), so a missing text is always on the list for the
// cosmetologist (CONTENT_TODO.md) and never a silent gap.
export const OBSERVATION_TEMPLATE_IDS = {
  missingCleanser: 'obs-missing-cleanser',
  missingMoisturizer: 'obs-missing-moisturizer',
  missingSunscreen: 'obs-missing-sunscreen',
  conflict: 'obs-conflict',
  manyActives: 'obs-many-actives',
  // the same finding for a profile that states sensitive skin (the example text of the spec)
  manyActivesSensitive: 'obs-many-actives-sensitive',
  duplicateActive: 'obs-duplicate-active',
  personalRestriction: 'obs-personal-restriction',
  preferenceMismatch: 'obs-preference-mismatch',
  incompleteNoComposition: 'obs-incomplete-no-composition',
  incompleteLowCoverage: 'obs-incomplete-low-coverage',
  doctorNote: 'obs-doctor-note',
} as const;

export type ObservationTemplateId =
  (typeof OBSERVATION_TEMPLATE_IDS)[keyof typeof OBSERVATION_TEMPLATE_IDS];
