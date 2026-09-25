const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': "The email or password you entered is incorrect.",
  'auth/wrong-password': "The email or password you entered is incorrect.",
  'auth/user-not-found': "We couldn't find an account with that email.",
  'auth/invalid-email': "Please enter a valid email address.",
  'auth/missing-password': "Please enter your password.",
  'auth/user-disabled': "This account has been disabled. Please contact support.",
  'auth/email-already-in-use': "An account with this email already exists. Try signing in instead.",
  'auth/weak-password': "Please choose a stronger password (at least 6 characters).",
  'auth/too-many-requests': "Too many attempts. Please wait a moment and try again.",
  'auth/network-request-failed': "Network error. Please check your connection and try again.",
  'auth/popup-closed-by-user': "Sign-in was cancelled.",
  'auth/cancelled-popup-request': "Sign-in was cancelled.",
  'auth/requires-recent-login': "Please sign in again to continue.",
  'auth/operation-not-allowed': "This sign-in method isn't available right now.",
  'auth/account-exists-with-different-credential': "An account already exists with this email using a different sign-in method.",
};

/** Maps a Firebase Auth error to plain-language copy; unrecognized errors fall back to a generic message rather than surfacing the raw "Firebase: Error (auth/...)" string. */
export function getFriendlyAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  return fallback;
}

// Routes a Firebase Auth error to how the Sign In / Sign Up screens should surface it - a field
// message, the shared credential/rate-limit/disabled banner, or the system ErrorSheet. Doesn't
// touch AUTH_ERROR_MESSAGES/getFriendlyAuthErrorMessage above, which forgot-password.tsx and
// GoogleAuthButton.tsx still use as-is.
//
// Error codes found in this codebase and where each one now routes:
//   auth/invalid-email            -> field: email  ("Enter a valid email, like name@email.com.")
//   auth/missing-password         -> field: password ("Enter your password.")
//   auth/invalid-credential       -> banner: "Incorrect email or password. Please try again."
//   auth/wrong-password           -> banner: same as above
//   auth/user-not-found           -> banner: same as above (not "no account found" - same
//                                    generic message as wrong-password, so the banner never
//                                    reveals whether the email or the password was wrong)
//   auth/too-many-requests        -> banner: "Too many attempts. Please wait a few minutes and try again."
//   auth/user-disabled            -> banner: "This account has been disabled. Please contact support."
//   auth/email-already-in-use     -> Sign Up only -> field: email ("This email is already registered.")
//                                    Sign In context -> falls through to system (shouldn't occur there)
//   auth/weak-password            -> Sign Up only -> field: password (existing weak-password copy)
//   auth/network-request-failed   -> system, isNetwork: true
//   everything else (incl. auth/operation-not-allowed, auth/requires-recent-login,
//   auth/popup-closed-by-user, auth/cancelled-popup-request,
//   auth/account-exists-with-different-credential - none of which are reachable from a plain
//   email/password Sign In or Sign Up submit) -> system, isNetwork: false
//
// No "account not verified" code exists anywhere in this app's auth flow (email verification is
// never checked at sign-in), so that case from the spec isn't implemented - there's nothing to map.
export type AuthErrorHandling =
  | { kind: 'field'; field: 'email' | 'password'; message: string }
  | { kind: 'banner'; message: string }
  | { kind: 'system'; isNetwork: boolean };

export function getAuthErrorHandling(error: unknown, context: 'signin' | 'signup'): AuthErrorHandling {
  const code = (error as { code?: string } | null)?.code;

  switch (code) {
    case 'auth/invalid-email':
      return { kind: 'field', field: 'email', message: 'Enter a valid email, like name@email.com.' };
    case 'auth/missing-password':
      return { kind: 'field', field: 'password', message: 'Enter your password.' };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { kind: 'banner', message: 'Incorrect email or password. Please try again.' };
    case 'auth/too-many-requests':
      return { kind: 'banner', message: 'Too many attempts. Please wait a few minutes and try again.' };
    case 'auth/user-disabled':
      return { kind: 'banner', message: 'This account has been disabled. Please contact support.' };
    case 'auth/email-already-in-use':
      if (context === 'signup') {
        return { kind: 'field', field: 'email', message: 'This email is already registered.' };
      }
      return { kind: 'system', isNetwork: false };
    case 'auth/weak-password':
      return { kind: 'field', field: 'password', message: 'Please choose a stronger password (at least 6 characters).' };
    case 'auth/network-request-failed':
      return { kind: 'system', isNetwork: true };
    default:
      return { kind: 'system', isNetwork: false };
  }
}
