/**
 * Client-side password strength check. Firebase Auth itself only enforces a 6-character
 * minimum, so this is what actually stops weak passwords at signup.
 */
const MIN_LENGTH = 8;

export interface PasswordRequirement {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

// Single source of truth for both the live checklist (register.tsx) and the submit-time error.
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: 'length', label: `At least ${MIN_LENGTH} characters`, test: (p) => p.length >= MIN_LENGTH },
  { key: 'capital', label: 'One capital letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
];

export function getPasswordPolicyError(password: string): string | null {
  const unmet = PASSWORD_REQUIREMENTS.find((r) => !r.test(password));
  return unmet ? `Password must include: ${unmet.label.toLowerCase()}` : null;
}
