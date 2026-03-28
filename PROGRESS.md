# NiceDay Carwash — Project Progress

> Last updated: 2026-03-29

---

## While Blaze, VAPT, and OAuth are on hold

You can still move the product forward:

| Blocker | What you **can** do now |
|---------|-------------------------|
| **Blaze** (FCM, Storage, Functions) | Keep using Spark for dev; document which features need Blaze; implement **server-side payment + rules** design on paper or in a separate repo until you upgrade. |
| **VAPT / GCash** | Harden **app hygiene** (done below), keep **`firebase/database.rules.json`** in sync with the console, tighten rules called out in **`firebase/SECURITY_README.md`**, avoid promising production payments until webhook exists. |
| **Google OAuth** | Leave **`GOOGLE_SIGN_IN_ENABLED = false`**; email/password unchanged. |

**Important:** “Client-side security” means **validation, logging hygiene, and fail-fast config** — not access control. **Realtime Database Security Rules** and a **payment webhook** are what auditors and GCash care about.

---

## Recent hygiene / security-prep changes (2026-03-29)

- **`lib/env.ts` + `components/EnvConfigurationError.tsx`:** App won’t boot the main UI if core `EXPO_PUBLIC_FIREBASE_*` vars are missing (avoids accidental blank-config builds).
- **`lib/logger.ts`:** `logAppError()` only logs details in **`__DEV__`** (reduces accidental data leakage via logs in release builds).
- **`lib/sanitize.ts`:** Trim + length limits on names at **register** and **edit profile** (input hygiene only).
- **`firebase/SECURITY_README.md`:** Threat model, path map, **VAPT-oriented rule review** (e.g. `Notifications/ByBranch` write scope, `isPaid` on user writes).
- **`firebase/database.rules.json`:** **In-repo copy of your live RTDB rules** — update this file whenever you change rules in the console (and vice versa) so Git matches production.
- **`PaymentPage`:** Documented as mock; uses `logAppError` for failures.
- **`app/index.tsx`:** Removed long dead **Facebook** comment block.

---

## Current status (executive)

| Goal | Status |
|------|--------|
| **Core app (booking, admin, Firebase)** | In good shape for continued development |
| **Google sign-in** | **Disabled** in UI via `GOOGLE_SIGN_IN_ENABLED` in `app/index.tsx`; full flow remains in code for when OAuth is configured in the **same** GCP project as Firebase |
| **Payments / GCash** | **Not production-ready** — `PaymentPage` updates Realtime Database only; no payment gateway, no server verification, no webhooks |
| **Deploy (stores / EAS)** | **`eas.json`** + **`DEPLOYMENT.md`** + **`.env.example`** added; run **`eas init`** once to link Expo project and set EAS secrets |

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | React Native + Expo SDK ~54 |
| Routing | Expo Router v6 (file-based) |
| Backend | Firebase Auth + Realtime Database |
| Styling | NativeWind (Tailwind) + TypeScript (strict) |

---

## Project audit (2026-03-29)

### Application structure
- **Auth:** `app/index.tsx` (login), `register.tsx`, `forgot-password.tsx`, onboarding + splash.
- **User area:** tabs — home, book, history, vehicles, profile; modals for vehicles/profile; payment, booking success/progress, notifications, cancelled bookings.
- **Admin area:** dashboard, bookings, services (services/add-ons/slots/bays), calendar, settings, edit profile.
- **Firebase:** `firebase/firebase.js` — config from `EXPO_PUBLIC_*` env vars; Auth with AsyncStorage persistence; RTDB singleton.
- **Secrets:** `.env` gitignored; no `eas.json` yet for build-time secrets on EAS.

### Dependencies (high level)
- Expo modules: router, auth-session, web-browser, location, image-picker, fonts, etc.
- **No** payment SDK (PayMongo, Xendit, Stripe, etc.).
- **No** `expo-notifications` / FCM wired to flows.
- Maps: `react-native-maps` + `PROVIDER_GOOGLE` on native branch picker.

### Payment flow (as implemented)
- Booking flow stores `paymentMethod` (e.g. cash vs E-Wallet copy mentioning GCash) in Firebase.
- **`components/ui/user/payment/PaymentPage.tsx`:** user picks “GCash” (or other UI option) and taps pay → **only** `update()` on `ReservationsByUser` and `ReservationsByBranch` sets `isPaid: true` and `status: 'ongoing'`. **No money moves; no PSP.**
- **Risk for production:** Anyone who can call Firebase with current rules could mark paid. Real integration must use **server-side** payment creation + **webhook** (or verified Cloud Function) before updating `isPaid`.

### Google sign-in (as implemented)
- Flag: **`GOOGLE_SIGN_IN_ENABLED = false`** in `app/index.tsx` → shows muted **Continue with Google** row; tap explains it’s unavailable.
- When set to **`true`:** uses `expo-auth-session/providers/google` only if platform client IDs exist in `.env` (avoids Android crash on empty `androidClientId`).
- **Reminder:** OAuth clients must live in the **same Google Cloud project** as the Firebase project, or tokens/Firebase Google provider will not align.

### Deployment readiness
| Item | Notes |
|------|--------|
| `eas.json` | **Present** — profiles: `development`, `preview` (internal APK), `production` (Android App Bundle + iOS) |
| `DEPLOYMENT.md` | Step-by-step: EAS secrets, build, submit, Firebase rules deploy |
| `.env.example` | Template for all `EXPO_PUBLIC_*` keys (copy to `.env` locally) |
| `firebase.json` | Root file → deploy RTDB rules: `firebase deploy --only database` |
| App identifiers | `app.json`: iOS bundle `com.nicedaycarwash.app`, Android package `com.nicedaycarwash.app` |
| Store versioning | `ios.buildNumber`, `android.versionCode` set to **1** — bump each store release |
| iOS | `ITSAppUsesNonExemptEncryption: false` if you only use standard HTTPS (typical) |
| Image picker | `expo-image-picker` config plugin + usage strings for App Store review |
| Native folders | `/ios`, `/android` in `.gitignore` — EAS runs prebuild on build servers |
| Expo project link | Run **`eas init`** once so `expo.extra.eas.projectId` exists in **app.json** |
| Store listings | Privacy policy URL, screenshots, content rating — still on you in Play / ASC |

### Security & compliance
- **Realtime Database rules:** captured in **`firebase/database.rules.json`** with review notes in **`firebase/SECURITY_README.md`**. **Before GCash:** tighten **`Notifications/ByBranch`** `.write` (currently any authenticated user) and **`isPaid` / `status`** on **`ReservationsByUser`** (users can write their own node today).
- **Payment PCI:** use a licensed PSP; do not handle raw card data in the app.

### Testing & quality
- No automated test suite referenced in `package.json` beyond `expo lint`.
- No `TODO`/`FIXME` grep hits in TS/TSX (snapshot audit).

---

## Completed features (summary)

### Auth
- [x] Email/password login & registration
- [x] Forgot password
- [x] Onboarding (once, persisted)
- [x] Role-based routing (user vs admin)
- [x] Google sign-in code path + **disabled** product flag (`GOOGLE_SIGN_IN_ENABLED`)

### User — booking & profile
- [x] Branch selection, booking stepper, vehicles, services/add-ons, confirmation, Firebase writes
- [x] History, details modals, vehicles CRUD, profile edit, sign out
- [x] Payment **screen** + booking fee UX; **settle** step is mock (DB flag only)

### Admin
- [x] Dashboard, appointments lifecycle, services/slots/bays, calendar, settings

### Infrastructure
- [x] `useAlert`, skeletons, branchId normalization patterns, listener cleanup in key screens

---

## Roadmap: GCash-ready payments

GCash is typically offered **through a Philippine PSP** (e.g. **PayMongo**, **Xendit**, **DragonPay**, etc.), not by embedding GCash APIs directly in the client.

**Recommended architecture**

1. **Backend (required):** Cloud Functions, Cloud Run, or a small Node server that:
   - Creates a **payment intent / checkout session** with the PSP (amount, reference id = `appointmentId` or internal payment id).
   - Exposes a minimal API the app calls with the user’s Firebase ID token.
2. **Mobile app:** Open **WebBrowser** / **in-app browser** / PSP SDK to complete payment; handle return URL / deep link (`scheme`: `nicedaycarwash` in `app.json`).
3. **Webhook:** PSP calls your backend on success/failure; backend **verifies signature**, then updates RTDB: `isPaid`, `status`, optional `paymentProvider`, `paymentId`, `paidAt`.
4. **Rules:** Client cannot directly set `isPaid: true` for production; only privileged paths (admin override / server) should.

**App code touchpoints**

- Replace mock block in `PaymentPage.tsx` `handlePayment` with: call backend → open PSP URL → poll or rely on push when webhook completes.
- Optionally store `paymentIntentId` on the booking node for reconciliation.

---

## Roadmap: deploy

See **`DEPLOYMENT.md`** for the full checklist. Short version:

1. `eas login` → **`eas init`** (link project) → set **EAS secrets** for every `EXPO_PUBLIC_*` key
2. `npm run build:production:android` / `build:production:ios` (or `eas build` with profiles from **`eas.json`**)
3. `eas submit` when binaries are ready; complete Play Console / App Store Connect metadata (**privacy policy** URL, etc.)
4. `firebase deploy --only database` when **`firebase/database.rules.json`** changes
5. Bump **`expo.version`**, **`ios.buildNumber`**, and **`android.versionCode`** each release

---

## Next steps (prioritized)

| Priority | Task |
|----------|------|
| P0 | Choose PSP (GCash-capable); implement **server** payment + **webhook**; then wire `PaymentPage` |
| P0 | Tighten RTDB rules per **`firebase/SECURITY_README.md`** (`Notifications/ByBranch` write, user-writable `isPaid`) + PSP webhook |
| P1 | Add **`eas.json`** and document EAS env for production builds |
| P1 | When ready: set **`GOOGLE_SIGN_IN_ENABLED = true`** and OAuth in Firebase-linked GCP project |
| P2 | Email verification after registration |
| P2 | Push notifications (`expo-notifications` + FCM) for booking state |
| P2 | Profile images via Firebase Storage |

---

## File map (key screens)

```
app/
  index.tsx                 ← Login (`GOOGLE_SIGN_IN_ENABLED`)
  register.tsx
  forgot-password.tsx
  user/(tabs)/{home,book,history,vehicles,profile}.tsx
  user/payment.tsx          ← Routes to PaymentPage (mock settle)
  admin/(tabs)/{dashboard,bookings,services,calendar,settings}.tsx
firebase/firebase.js        ← Auth + RTDB init from env
components/ui/user/payment/PaymentPage.tsx
```

---

## Changelog (recent)

- **2026-03-29 (deploy prep):** **`eas.json`**, root **`firebase.json`**, **`.env.example`**, **`DEPLOYMENT.md`**, **`package.json`** EAS build scripts; **`app.json`**: `ios.buildNumber`, `android.versionCode`, export compliance plist, **`expo-image-picker`** plugin + permission strings.
- **2026-03-29 (pm):** Env validation at root, dev-only error logger, name sanitization, Firebase **`database.rules.json`** (live rules mirror) + **`SECURITY_README.md`** review notes, payment screen documentation, removed Facebook comment clutter.
- **2026-03-29:** Project audit; GCash/deploy roadmap; Google sign-in kept in codebase but **disabled** via `GOOGLE_SIGN_IN_ENABLED` in `app/index.tsx`.
