// Only the site itself (production and the preview addresses) may call the function.
// ALLOWED_ORIGINS is a comma-separated list. An entry is either an exact origin
// ("https://skin-barrier.example") or one subdomain wildcard ("https://*.example.com").
// Never put "https://*.vercel.app" in Production: anyone can host a page on vercel.app (stage 14 audit).
// A bare "*" is never accepted. The function never sends Access-Control-Allow-Origin.

function parse(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function matchesWildcard(origin: URL, entry: string): boolean {
  const star = entry.indexOf('*.');
  if (star < 0) return false;
  const protocol = entry.slice(0, star);
  const suffix = entry.slice(star + 1); // ".vercel.app"
  if (!/^https?:\/\/$/.test(protocol)) return false;
  // the wildcard must stand for at least one label and the suffix must be a real domain
  if (!/^\.[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(suffix)) return false;
  return (
    `${origin.protocol}//` === protocol &&
    origin.hostname.endsWith(suffix) &&
    origin.hostname.length > suffix.length
  );
}

export function isOriginAllowed(header: string | null, allowed: readonly string[]): boolean {
  if (header === null || header === '' || header === 'null') return false;
  const origin = parse(header);
  if (!origin || (origin.protocol !== 'https:' && origin.protocol !== 'http:')) return false;
  // an Origin header has no path; anything else is not an origin
  if (origin.origin !== header) return false;
  return allowed.some((entry) => {
    if (entry === '*') return false;
    if (entry.includes('*')) return matchesWildcard(origin, entry);
    return entry === origin.origin;
  });
}
