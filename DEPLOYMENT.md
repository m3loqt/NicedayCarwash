# Deployment guide — NicedayCarwash (Expo / EAS)

## Prerequisites

- Apple Developer account (iOS) and Google Play Console account (Android).
- [Expo](https://expo.dev) account; project linked to this repo (`eas init` once).
- Firebase project with Realtime Database rules deployed (see **Rules** below).

## 1. Environment variables

1. Copy **`.env.example`** → **`.env`** for local development.
2. For **EAS builds**, `EXPO_PUBLIC_*` variables must be present at **build time** (they are inlined into the bundle).

   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-key"
   # repeat for each EXPO_PUBLIC_* key
   ```

   Or use **EAS Environment variables** in the Expo dashboard (recommended for teams).

3. After changing secrets, run a **new** build (existing binaries won’t pick up changes).

## 2. Link EAS to this project (one time)

```bash
npm install -g eas-cli
eas login
eas init
```

Choose an existing Expo project or create one; this writes `projectId` into **app.json** under `expo.extra.eas`.

## 3. Production builds

```bash
# Android App Bundle (Play Store)
eas build --profile production --platform android

# iOS (App Store / TestFlight)
eas build --profile production --platform ios
```

**Preview** (internal testing, Android APK):

```bash
eas build --profile preview --platform android
```

**Development client** (native modules debugging):

```bash
eas build --profile development --platform android
```

## 4. Store submission

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Requires store credentials configured once (`eas credentials` or Expo dashboard).

## 5. Firebase Database rules

Rules live in **`firebase/database.rules.json`**. Deploy with Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only database
```

`firebase.json` in the repo root points at `firebase/database.rules.json`.

## 6. Pre-flight checklist

- [ ] All **`EXPO_PUBLIC_FIREBASE_*`** set for production EAS build.
- [ ] **`firebase/database.rules.json`** matches console (or deploy from repo).
- [ ] Tighten rules called out in **`firebase/SECURITY_README.md`** before GCash / strict VAPT.
- [ ] **Privacy policy URL** added in Play Console / App Store Connect (and in-app if required).
- [ ] **GCash / PSP** not production until webhook + rule changes (see **PROGRESS.md**).
- [ ] **`app.json`**: `version` / iOS **buildNumber** / Android **versionCode** bumped per release.

## 7. Optional: EAS Update (OTA JS)

Not configured by default. After enabling in Expo dashboard, add `expo-updates` config per [Expo docs](https://docs.expo.dev/eas-update/getting-started/).
