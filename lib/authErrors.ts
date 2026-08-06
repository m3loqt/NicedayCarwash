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
