# NicedayCarwash – Project Context

A mobile-first car wash booking app built with **Expo (React Native)**. Customers can book washes by branch, vehicle, and time slot; branch staff (admins) manage appointments, services, and bays.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | React Native 0.81.x, Expo SDK 54 |
| **Framework** | React 19 |
| **Routing** | Expo Router 6 (file-based) |
| **Language** | TypeScript (strict) |
| **Styling** | NativeWind 4 (Tailwind for RN), `global.css` |
| **Backend** | Firebase (Auth + Realtime Database) |
| **Fonts** | Inter (`@expo-google-fonts/inter`) |
| **Maps** | `react-native-maps` (branch selection) |
| **State** | Local React state; Firebase `onValue` for real-time data |

**Path alias:** `@/*` → project root (e.g. `@/components/...`, `@/firebase/...`).

---

## Project Structure

```
app/                        # Expo Router routes
├── _layout.tsx             # Root: fonts, splash, ThemeProvider, Slot
├── index.tsx               # Login (email + Google); splash → onboarding → login
├── register.tsx            # Sign up
├── forgot-password.tsx     # Password reset
├── onboarding.tsx          # Route that shows OnboardingScreen if not seen
├── admin/                  # Admin area (role === 'admin')
│   ├── _layout.tsx         # Stack: (tabs) + edit-profile
│   ├── edit-profile.tsx
│   └── (tabs)/
│       ├── _layout.tsx     # Tabs: dashboard, bookings, services, settings
│       ├── dashboard.tsx   # Home: summary cards, next up, manage services, notifications
│       ├── bookings.tsx    # Appointments by tab (pending/ongoing/completed/cancelled)
│       ├── services.tsx    # Services, add-ons, time slots, bays
│       └── settings.tsx    # Account (profile, notifications, sign out)
└── user/                   # Customer area (role === 'default')
    ├── _layout.tsx         # Stack: (tabs) + add-vehicle, edit-vehicle, edit-profile, booking-success, payment
    ├── (tabs)/
    │   ├── _layout.tsx     # Tabs: home, history, book, vehicles, profile
    │   ├── home.tsx        # Branches slider, promo
    │   ├── history.tsx     # Booking history by tab
    │   ├── book.tsx        # Branch selection → booking flow
    │   ├── vehicles.tsx    # Vehicle list + add/edit
    │   └── profile.tsx     # Account (menu, sign out)
    ├── add-vehicle.tsx     # Modal
    ├── edit-vehicle.tsx    # Modal
    ├── edit-profile.tsx    # Modal
    ├── booking-success.tsx
    └── payment.tsx         # Modal

components/
├── OnboardingScreen.tsx    # 3-step onboarding (intro, skip the wait, track service)
├── SplashScreen.tsx
├── SignOutModal.tsx        # Shared bottom-sheet sign-out confirm
├── ui/
│   ├── admin/             # Admin UI by feature
│   │   ├── AdminScreenSkeleton.tsx   # Dashboard, list, account, services skeletons
│   │   ├── dashboard/      # Header, transaction cards, next up, manage services, notifications, modals
│   │   ├── appointments/  # Header, tabs, search, list, cards, cancel/complete/bay modals
│   │   └── services/      # Services, add-ons, time slots, bays + modals
│   ├── user/
│   │   ├── UserScreenSkeleton.tsx    # Home, list, account, branch list skeletons
│   │   ├── home/          # Header, branches slider, promo
│   │   ├── booking/       # BranchSelection (native/web), BookingFlow, steps, modals
│   │   ├── history/       # Header, tabs, list, details modal
│   │   ├── vehicles/      # Header, list, add/edit, classification modal
│   │   ├── profile/       # EditProfile, SuccessModal
│   │   └── payment/      # PaymentPage, badge, button
│   └── common/            # e.g. AlertModal
constants/                  # theme.ts (Colors, Fonts)
hooks/                      # use-alert, use-color-scheme, use-theme-color
firebase/                    # firebase.js (auth + db init)
assets/images/               # intro1, skip, progress, branch1–3, logos, icons
global.css                  # Tailwind base
```

---

## Auth & Role-Based Access

- **Login** (`app/index.tsx`): Email/password or Google. User doc is read from `users/{uid}`; `role` is stored in AsyncStorage and used for redirect.
  - `role === 'admin'` → `router.replace('/admin/(tabs)/dashboard')`
  - else → `router.replace('/user/(tabs)/home')`
- **Register**: Creates `users/{uid}` with `role: 'default'`.
- **Onboarding**: Shown once; completion stored in AsyncStorage (`hasSeenOnboarding`). After login, onboarding is skipped if already seen.
- **Sign out**: Shared bottom-sheet modal (`SignOutModal`); clears storage and redirects to `/`.

---

## Firebase Realtime Database (High-Level)

- **`users/{uid}`**  
  User profile: `firstName`, `lastName`, `email`, `phone`, `profileImage`, `role` (`'default' | 'admin'`). Admins: `branchId` (or `branch`) linking to their branch.

- **`Branches/{branchId}`**  
  Branch config and operator-managed data:
  - `profile`: name, address, contact, schedule, coordinates (lat/lng).
  - `TimeSlots`: array/list of time slots (e.g. `{ time, status }`).
  - `Bays`: wash bays (status, etc.).
  - `Services`, `AddOns`: offer lists (name, price, availability toggles).

- **`Reservations/ReservationsByUser/{userId}/{datePath}/{appointmentId}`**  
  One booking per user per date/appointment. Used for user history and payment updates.

- **`Reservations/ReservationsByBranch/{branchId}/{datePath}/{appointmentId}`**  
  Same bookings indexed by branch/date for admin list and dashboard.

Booking payload typically includes: branch info, time slot, vehicle, services/add-ons, amount, payment method, status (`pending` | `accepted` | `ongoing` | `completed` | `cancelled`), `isPaid`, etc.

---

## Main User Flows

1. **Book a wash**  
   Book tab → Branch selection (map/list; branches from `Branches/`) → Choose vehicle (from `users/{uid}/Vehicle Information`) → Services step (branch services/add-ons, date/time) → Confirmation → Create reservation in `ReservationsByUser` and `ReservationsByBranch` → Success or payment screen.

2. **History**  
   History tab → List from `Reservations/ReservationsByUser/{uid}` by tab (pending/ongoing/completed/cancelled) → Tap for details modal.

3. **Vehicles**  
   Vehicles tab → List from `users/{uid}/Vehicle Information` → Add/Edit (modal) → Optional classification modal.

4. **Profile**  
   Account menu (edit profile, payment, addresses, reset password), sign out.

---

## Main Admin Flows

1. **Dashboard**  
   Summary cards (pending/ongoing/completed/cancelled) from `Reservations/ReservationsByBranch/{branchId}`; “Next up”; “Manage services” link; notifications (pending reservations). Tapping a card opens Bookings with that tab; tapping a notification opens appointment details bottom sheet.

2. **Bookings**  
   Tabs (pending/ongoing/completed/cancelled) + search. List from `Reservations/ReservationsByBranch/{branchId}`. Actions: Accept (assign bay), Complete, Cancel (reason). Appointment details in shared bottom-sheet modal.

3. **Services**  
   CRUD for Services, Add-ons, Time slots, Bays for the admin’s branch (`Branches/{branchId}/...`). Multiple modals (add/edit time slot, add/edit bay, set availability, confirm toggles).

4. **Account (Settings)**  
   Same layout pattern as user Account: profile block, Edit profile, Notifications, Sign out (bottom-sheet modal).

---

## UI & Styling Conventions

- **NativeWind:** Use Tailwind classes in `className`; add new content paths in `tailwind.config.js` if needed.
- **Theme:** `constants/theme.ts` (Colors, Fonts). Prefer theme tokens for consistency.
- **Headers:** Large left-aligned title (e.g. `text-3xl font-bold text-[#1A1A1A]`) with `px-5 pt-4 pb-4` on admin and user screens where we standardized.
- **Cards/buttons:** Rounded with `rounded-lg`; no borders on many cards (per design). Primary yellow: `#F9EF08`; backgrounds: `#FAFAFA`, `#FFFFFF`.
- **Modals:** Bottom-sheet style: `Modal` + `transparent` + `animationType="slide"`, handle bar, `rounded-t-3xl`, primary/secondary buttons.
- **Tab bars:** Ionicons; active `#F9EF08`, inactive gray; `tabBarShowLabel: false` on admin/user tabs. Lazy tabs (`lazy: true`) on both.

---

## Loading & Skeletons

- **Lazy tabs:** Admin and user tab layouts use `lazy: true` so a tab’s screen mounts only when first opened.
- **Skeletons:** Used while data loads (e.g. dashboard, bookings list, history list, vehicles list, account, branch list). No fade-in; content replaces skeleton when ready.
- **Skeleton components:** `AdminScreenSkeleton` (dashboard, list, account, services), `UserScreenSkeleton` (home, list, account, branch list). Pulse animation via `Animated` in skeleton only.

---

## Key Scripts

```bash
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web
npm run lint       # ESLint
```

---

## Safety & Conventions

- Do **not** change Expo SDK or React Native versions unless explicitly required.
- Route file renames change URLs; update any `router.push`/`replace` or deep links.
- New directories with Tailwind usage should be added to `tailwind.config.js` content.
- Modals must be declared in the correct Stack layout with `presentation: 'modal'` where intended.

---

## File Reference (Quick)

| Purpose | File(s) |
|--------|--------|
| App entry, fonts, theme | `app/_layout.tsx`, `global.css`, `constants/theme.ts` |
| Login & role redirect | `app/index.tsx` |
| Firebase init | `firebase/firebase.js` |
| Onboarding | `components/OnboardingScreen.tsx`, `app/onboarding.tsx` |
| User tabs | `app/user/(tabs)/_layout.tsx` + home, history, book, vehicles, profile |
| Admin tabs | `app/admin/(tabs)/_layout.tsx` + dashboard, bookings, services, settings |
| Booking flow | `components/ui/user/booking/BranchSelection.*`, `BookingFlow.tsx`, steps |
| Admin dashboard | `app/admin/(tabs)/dashboard.tsx`, `components/ui/admin/dashboard/*` |
| Admin bookings | `app/admin/(tabs)/bookings.tsx`, `components/ui/admin/appointments/*` |
| Admin services | `app/admin/(tabs)/services.tsx`, `components/ui/admin/services/*` |
| Sign-out modal | `components/ui/SignOutModal.tsx` |

This document gives a single place to understand the whole project for onboarding and context.
