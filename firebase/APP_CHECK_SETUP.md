# Firebase App Check Setup (Expo + Firebase JS SDK)

This project now includes code scaffolding for App Check initialization:

- `firebase/appCheck.ts`
- `firebase/firebase.js` calls `initializeFirebaseAppCheck(app)`

## What is implemented in code

- Web App Check bootstrap via `ReCaptchaV3Provider` when `EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` is set.
- Safe no-op on native builds with a warning log (managed Expo runtime cannot fully enforce native attestation without extra native integration).

## Manual setup required (Firebase Console)

1. In Firebase Console, open **App Check**.
2. Register your app(s):
   - Web: reCAPTCHA v3 provider.
   - Android: Play Integrity provider.
   - iOS: App Attest (recommended) or DeviceCheck.
3. Start in **monitor** mode, then switch to **enforced** after verifying legitimate traffic.
4. Enable enforcement for:
   - **Realtime Database**
   - (and any other Firebase products you use)

## Google Cloud API key restrictions (manual)

For the key used by this app, apply platform restrictions:

- Android key restriction: package name + SHA-1 certificate fingerprints.
- iOS key restriction: bundle identifier.
- Web key restriction: allowed referrer domains.

Also set API restrictions to only required Firebase APIs.

## Expo native caveat

For true native attestation in production apps, you typically need native App Check integration (often via custom dev client / native modules) plus Console enforcement. Client-only throttling in app code is supplemental and does not replace server-side protections.
