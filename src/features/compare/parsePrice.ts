/**
 * Reads the price the user typed: "20", "20.5" or "20,5". Anything else (empty, text, zero,
 * negative) is "no price" (null). The price is never guessed.
 */
export function parsePrice(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value > 0 ? value : null;
}
