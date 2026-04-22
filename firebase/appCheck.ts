import { Platform } from 'react-native';
import type { FirebaseApp } from 'firebase/app';
import { logInfo, logWarn } from '@/lib/logger';

let appCheckInitialized = false;

/**
 * Best-effort App Check bootstrap.
 *
 * In this Expo-managed app, robust native attestation (Play Integrity/App Attest)
 * requires additional native integration and Firebase Console setup.
 * This initializes web reCAPTCHA provider only on web when configured.
 */
export async function initializeFirebaseAppCheck(app: FirebaseApp): Promise<void> {
  if (appCheckInitialized) return;

  if (Platform.OS !== 'web') {
    logWarn('AppCheck', 'Native App Check is not auto-initialized in managed Expo runtime');
    return;
  }

  const siteKey = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey) {
    logWarn('AppCheck', 'Missing EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY; web App Check disabled');
    return;
  }

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
    logInfo('AppCheck', 'Initialized Firebase App Check for web');
  } catch {
    logWarn('AppCheck', 'Failed to initialize Firebase App Check for web');
  }
}
