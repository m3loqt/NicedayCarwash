/**
 * Validates public Firebase config at runtime. Client-side only — does not
 * secure data; prevents shipping builds with empty EXPO_PUBLIC_*.
 */
const REQUIRED_FIREBASE_PUBLIC_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

export type EnvCheckResult =
  | { ok: true }
  | { ok: false; missing: string[] };

export function validateFirebasePublicEnv(): EnvCheckResult {
  // Each access must be a static `process.env.EXACT_NAME` expression (not a
  // computed/dynamic lookup) so Expo's build-time env inlining can replace it —
  // a dynamic process.env[key] loop always reads as undefined in release builds.
  const values: Record<(typeof REQUIRED_FIREBASE_PUBLIC_KEYS)[number], string | undefined> = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  const missing = REQUIRED_FIREBASE_PUBLIC_KEYS.filter((key) => !values[key]?.trim());
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
