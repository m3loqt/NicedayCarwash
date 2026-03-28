# Firebase security (Realtime Database)

## Canonical rules in this repo

**`firebase/database.rules.json`** — mirror of your current Realtime Database rules (keep in sync when you change them in the Firebase console). From the **repo root**, with [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
firebase deploy --only database
```

The root **`firebase.json`** file points at `firebase/database.rules.json`.

## What the mobile app **cannot** do

- **Client-side validation is not authorization.** Tokens can be used from REST clients. **Rules** (and for money, a **server + webhook**) define real access control.

- **`isPaid` / payment fields:** Your rules allow **customers** to **write** their own subtree under `Reservations/ReservationsByUser/{userId}` (same as the app user). So a user can set `isPaid: true` without paying unless you add **`.validate`** rules or move payment confirmation to **admin-only / server-only** writes. **Fix this before GCash production.**

## Rule review notes (VAPT-relevant)

| Area | Observation |
|------|-------------|
| **`Notifications/ByBranch/{branchId}`** | **`.write": "auth != null"`** — any signed-in user can write to **any** branch’s notification bucket. Tighten to the same admin/supervisor + `branchId` pattern as `.read`, or use a trusted backend only. |
| **`Reservations/ReservationsByUser/$userId`** | User (`auth.uid === $userId`) can **write** the whole subtree — includes **`isPaid`**, **`status`**. High risk for fake payments. Consider: validate `isPaid` only transitions via Cloud Function, or disallow `isPaid` changes for default role. |
| **`ReservationsByBranch`** | Admin/supervisor for that branch can write — acceptable for operational flows; ensure supervisors are trusted. |
| **`users/$userId/role`** | **`.validate`** — only superadmin can change role; new accounts get `default`. Good pattern. |
| **`advertisements`** | **`.read": true`** — public read (OK for public promos; ensure no sensitive data). |
| **`Branches`** | Authenticated read for all branches; writes scoped to superadmin or branch admin/supervisor on specific children. Reasonable for a multi-branch app. |

## Before VAPT / GCash integration

1. Tighten **Notifications/ByBranch** `.write`.
2. Add **validation** (or server-only updates) for **`isPaid`** / **`status`** on reservations.
3. Run every change through the Firebase **Rules Playground** / simulator.
4. **Blaze** when you need Cloud Functions for webhooks, FCM, Storage.

## Paths used by this app (reference)

| Path pattern | Typical access |
|--------------|----------------|
| `users/{uid}` | Profile; role guarded by `role` validate |
| `Reservations/ReservationsByUser/{uid}/...` | User + admin/supervisor reads; writes as above |
| `Reservations/ReservationsByBranch/{branchId}/...` | Branch staff |
| `Branches/...` | Branch config, services, slots, bays |
| `Calendar/{branchId}` | Branch calendar |
| `Vehicle Information/{userId}` | User vehicles |
| `Notifications/ByBranch`, `Notifications/ByUser` | In-app notification data |
| `auditLogs` | Superadmin |

## Google OAuth

OAuth client IDs must be created in the **same** Google Cloud project as Firebase.
