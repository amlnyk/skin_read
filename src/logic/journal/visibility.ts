import type { Settings, SkinProfile } from '@/types';

export type JournalFieldVisibility = {
  /** "Period of the menstrual cycle". */
  cyclePeriod: boolean;
  /** "Irritation after shaving". */
  shavingIrritation: boolean;
};

/**
 * Which optional fields the entry form shows. For a person to whom the cycle is not relevant
 * there are no extra fields: the cycle field appears only when the profile says the user
 * notices cycle effects, or when the user switched it on in the settings.
 */
export function journalFieldVisibility(
  profile: SkinProfile | null,
  settings: Settings,
): JournalFieldVisibility {
  return {
    cyclePeriod: profile?.cycle.status === 'noticed' || settings.cycleTrackingVisible,
    shavingIrritation: settings.showShavingField,
  };
}
