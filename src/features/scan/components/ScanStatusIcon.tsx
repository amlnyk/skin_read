import type { ScanStatus } from '@/types';

// One neutral shape for each status, so the status never rests on colour alone.
// The icon is decoration: the status is always written next to it.
const SHAPES: Record<ScanStatus, string> = {
  // circle
  may_fit: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16Z',
  // triangle
  caution: 'M12 4 21 20H3Z',
  // diamond
  personal_warnings: 'M12 3 21 12 12 21 3 12Z',
  // square with a question mark
  insufficient_info: 'M5 5h14v14H5Z',
};

export function ScanStatusIcon({ status }: { status: ScanStatus }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path
        d={SHAPES[status]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {status === 'insufficient_info' ? (
        <path
          d="M9 9.5a3 3 0 1 1 4.2 2.7c-.8.4-1.2.9-1.2 1.8M12 16.5v.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
