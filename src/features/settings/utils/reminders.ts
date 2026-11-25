import type { MessageKey } from '@/i18n';
import type { Settings } from '@/types';

export type ReminderId = keyof Settings['reminders'];

/** Starting times offered when a reminder is switched on. The user can change them. */
export const REMINDERS: readonly { id: ReminderId; labelKey: MessageKey; defaultTime: string }[] = [
  { id: 'am', labelKey: 'settings.reminderAm', defaultTime: '08:00' },
  { id: 'pm', labelKey: 'settings.reminderPm', defaultTime: '21:00' },
  { id: 'journal', labelKey: 'settings.reminderJournal', defaultTime: '20:00' },
];
