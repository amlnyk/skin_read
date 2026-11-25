import type { ObservationSeverity } from '@/types';

// One neutral shape for each degree, so the degree never rests on colour alone. The icon is
// decoration: the degree is always written next to it.
const SHAPES: Record<ObservationSeverity, string> = {
  // diamond
  important: 'M12 3 21 12 12 21 3 12Z',
  // triangle
  attention: 'M12 4 21 20H3Z',
  // circle
  info: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16Z',
};

export function SeverityIcon({ severity }: { severity: ObservationSeverity }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d={SHAPES[severity]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
