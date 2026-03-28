/**
 * Client-side input hygiene (length + trim). Does not replace server/rules validation.
 */
const DEFAULT_MAX = 500;

export function sanitizePlainText(input: string, maxLength = DEFAULT_MAX): string {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  return trimmed.slice(0, maxLength);
}

export function sanitizeNamePart(input: string, maxLength = 80): string {
  return sanitizePlainText(input, maxLength);
}
