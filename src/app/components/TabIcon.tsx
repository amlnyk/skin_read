// Line icons of the tab bar: 24 px, stroke 1.8, round joins (like the back button chevron).
// The scan icon repeats the corner brackets of the logo.
const PATHS = {
  home: 'M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z',
  care: 'M12 3.5c3.4 4.1 6 7.5 6 10.6a6 6 0 0 1-12 0c0-3.1 2.6-6.5 6-10.6z M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
  scan: 'M4 8.5V6a2 2 0 0 1 2-2h2.5 M15.5 4H18a2 2 0 0 1 2 2v2.5 M20 15.5V18a2 2 0 0 1-2 2h-2.5 M8.5 20H6a2 2 0 0 1-2-2v-2.5 M7.5 12h9',
  reference:
    'M5 5.5A2 2 0 0 1 7 3.5h12v14H7a2 2 0 0 0-2 2z M5 19.5a2 2 0 0 0 2 2h12v-4 M9 8h6 M9 11h4',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5',
} as const;

export type TabIconName = keyof typeof PATHS;

export function TabIcon({ name }: { name: TabIconName }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
