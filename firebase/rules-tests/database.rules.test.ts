import * as fs from 'fs';
import * as path from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// Tests run against firebase/database.rules.emulator.json - the exact file firebase.json wires
// the local Database emulator to (see PROGRESS.md: keep this file in sync with
// database.rules.json / the console). Run via `npm test`, which itself must run inside
// `firebase emulators:exec --only database "..."` - see the root README/package.json script -
// so a real (local) emulator is already listening on FIREBASE_DATABASE_EMULATOR_HOST.
const RULES_PATH = path.resolve(__dirname, '../database.rules.emulator.json');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'ndcw-rules-test',
    database: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
    },
  });

  // Fixture staff accounts these rules key every permission check off
  // (`root.child('users/' + auth.uid + '/role')` / `.../branchId`) - seeded once, bypassing
  // rules, since individual tests use distinct branch/reservation paths and never touch these.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.database();
    await db.ref('users/uid-superadmin').set({ role: 'superadmin' });
    await db.ref('users/uid-admin-a').set({ role: 'admin', branchId: 'branchA' });
    await db.ref('users/uid-supervisor-a').set({ role: 'supervisor', branchId: 'branchA' });
    await db.ref('users/uid-supervisor-b').set({ role: 'supervisor', branchId: 'branchB' });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

const superadmin = () => testEnv.authenticatedContext('uid-superadmin').database();
const adminA = () => testEnv.authenticatedContext('uid-admin-a').database();
const supervisorA = () => testEnv.authenticatedContext('uid-supervisor-a').database();
const supervisorB = () => testEnv.authenticatedContext('uid-supervisor-b').database();
const customer = (uid: string) => testEnv.authenticatedContext(uid).database();
const anon = () => testEnv.unauthenticatedContext().database();

describe('Notifications type enum (regression: silently swallowed the Confirmed -> Ongoing auto-trigger)', () => {
  // Before the fix, this enum excluded 'ongoing' and 'reminder' - and because RTDB multi-path
  // updates are all-or-nothing, autoStartTodayBookings's single update() call (status change +
  // this notification, bundled together) was being rejected in full by the rules, not just the
  // notification write. A booking's status never actually moved even when the trigger ran.
  const branchNotifPath = (id: string) => `Notifications/ByBranch/branchA/userNotifications/cust1/${id}`;
  const userNotifPath = (id: string) => `Notifications/ByUser/cust1/${id}`;

  const payload = (type: string) => ({
    title: 'Your Appointment Time Has Arrived',
    body: 'Test',
    type,
    read: false,
    createdAt: '2026-01-01T00:00:00.000',
  });

  test('supervisor can write type "ongoing" to ByBranch/userNotifications', async () => {
    await assertSucceeds(supervisorA().ref(branchNotifPath('n1')).set(payload('ongoing')));
  });

  test('supervisor can write type "reminder" to ByBranch/userNotifications', async () => {
    await assertSucceeds(supervisorA().ref(branchNotifPath('n2')).set(payload('reminder')));
  });

  test('supervisor can still write the pre-existing types', async () => {
    for (const type of ['accepted', 'completed', 'cancelled', 'pending']) {
      await assertSucceeds(supervisorA().ref(branchNotifPath(`n-${type}`)).set(payload(type)));
    }
  });

  test('an unrecognized type is rejected', async () => {
    await assertFails(supervisorA().ref(branchNotifPath('n-bad')).set(payload('bogus')));
  });

  test('same enum fix applies to Notifications/ByUser', async () => {
    await assertSucceeds(supervisorA().ref(userNotifPath('n1')).set(payload('ongoing')));
    await assertSucceeds(supervisorA().ref(userNotifPath('n2')).set(payload('reminder')));
    await assertFails(supervisorA().ref(userNotifPath('n-bad')).set(payload('bogus')));
  });
});

describe('Services/AddOns writes (regression: supervisors could not toggle availability)', () => {
  test('supervisor can disable a service in their own branch', async () => {
    await assertSucceeds(supervisorA().ref('Branches/branchA/Services/svc1/isAvailable').set(false));
  });

  test('supervisor can disable an add-on in their own branch', async () => {
    await assertSucceeds(supervisorA().ref('Branches/branchA/AddOns/addon1/isAvailable').set(false));
  });

  test('supervisor cannot touch another branch\'s services', async () => {
    await assertFails(supervisorA().ref('Branches/branchB/Services/svc1/isAvailable').set(false));
  });

  test('admin retains write access (unchanged by the fix)', async () => {
    await assertSucceeds(adminA().ref('Branches/branchA/Services/svc2/isAvailable').set(false));
  });

  test('an unauthenticated request is rejected', async () => {
    await assertFails(anon().ref('Branches/branchA/Services/svc1/isAvailable').set(false));
  });

  test('a plain customer cannot disable a service', async () => {
    await assertFails(customer('cust1').ref('Branches/branchA/Services/svc1/isAvailable').set(false));
  });
});

describe('acceptingReservations toggle (new: walk-ins-only day-off fallback)', () => {
  test('supervisor can pause reservations for their own branch', async () => {
    await assertSucceeds(supervisorA().ref('Branches/branchA/profile/acceptingReservations').set(false));
  });

  test('supervisor can turn it back on', async () => {
    await assertSucceeds(supervisorA().ref('Branches/branchA/profile/acceptingReservations').set(true));
  });

  test('supervisor of a different branch cannot toggle it', async () => {
    await assertFails(supervisorB().ref('Branches/branchA/profile/acceptingReservations').set(false));
  });

  test('a plain customer cannot toggle it', async () => {
    await assertFails(customer('cust1').ref('Branches/branchA/profile/acceptingReservations').set(false));
  });

  test('superadmin can toggle any branch', async () => {
    await assertSucceeds(superadmin().ref('Branches/branchB/profile/acceptingReservations').set(false));
  });
});

describe('Branch isolation baseline (unchanged by today\'s fixes - guards against a future regression)', () => {
  test('an authenticated customer can read the branch list', async () => {
    await assertSucceeds(customer('cust1').ref('Branches/branchA/profile').once('value'));
  });

  test('an unauthenticated request cannot read the branch list', async () => {
    await assertFails(anon().ref('Branches/branchA/profile').once('value'));
  });

  test('admin of one branch cannot write another branch\'s profile', async () => {
    await assertFails(adminA().ref('Branches/branchB/profile/name').set('Hijacked'));
  });
});

describe('ReservationsByUser self-service baseline (unchanged by today\'s fixes)', () => {
  test('a customer can create their own new pending, unpaid booking', async () => {
    await assertSucceeds(
      customer('cust1').ref('Reservations/ReservationsByUser/cust1/01-01-2026/appt1').set({
        status: 'pending',
        isPaid: false,
        appointmentId: 'ND-000001',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    );
  });

  test('a customer cannot create a booking already marked paid', async () => {
    await assertFails(
      customer('cust2').ref('Reservations/ReservationsByUser/cust2/01-01-2026/appt2').set({
        status: 'pending',
        isPaid: true,
        appointmentId: 'ND-000002',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    );
  });

  test('a customer cannot write into another customer\'s reservation path', async () => {
    await assertFails(
      customer('cust3').ref('Reservations/ReservationsByUser/cust1/01-01-2026/appt3').set({
        status: 'pending',
        isPaid: false,
        appointmentId: 'ND-000003',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    );
  });

  test('supervisor can write a reservation under any customer (accept/start/complete flows)', async () => {
    await assertSucceeds(
      supervisorA().ref('Reservations/ReservationsByUser/cust1/01-01-2026/appt1/status').set('accepted')
    );
  });
});
