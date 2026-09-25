// Shared field-validation rules for Sign In / Sign Up - same email regex register.tsx already
// used, now the one source both screens validate against instead of each keeping its own copy.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getEmailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email.';
  if (!EMAIL_REGEX.test(trimmed)) return 'Enter a valid email, like name@email.com.';
  return null;
}

export function getSignInPasswordError(password: string): string | null {
  if (!password) return 'Enter your password.';
  return null;
}
