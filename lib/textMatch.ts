/**
 * Search-text helpers. Goal: a customer typing "vrama", "v. rama", or "V Rama" should all
 * match a branch called "Niceday V Rama".
 */

/**
 * Lowercase and drop everything that isn't a letter or digit, so spacing, punctuation, case,
 * and accents (NFD splits an accented letter into base + combining mark, which is then dropped)
 * never affect a match.
 */
export function normalizeForSearch(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * True when every whitespace-separated token of `query` appears in `haystack` after
 * normalization. Token-based, so "niceday rama" still matches "Niceday V Rama".
 */
export function matchesSearch(
  haystack: string | null | undefined,
  query: string | null | undefined,
): boolean {
  const hay = normalizeForSearch(haystack);
  const tokens = (query ?? '')
    .split(/\s+/)
    .map(normalizeForSearch)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => hay.includes(t));
}
