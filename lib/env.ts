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
  const missing = REQUIRED_FIREBASE_PUBLIC_KEYS.filter(
    (key) => !process.env[key]?.trim(),
  );
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
