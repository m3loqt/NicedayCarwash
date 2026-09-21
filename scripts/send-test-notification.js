#!/usr/bin/env node
/*
 * Fires a real push notification through the actual production pipeline - writes a record
 * under Notifications/ByUser/{uid}/{id}, which is exactly what functions/src/pushNotifications.ts's
 * sendPushOnNewNotification listens for - without needing a real booking to trigger one.
 *
 * Requires the Firebase CLI to already be logged in (`firebase login`) with access to this
 * project; it shells out to `firebase database:set`, which authenticates as that user and
 * bypasses Realtime Database security rules (the same access `firebase database:get` already
 * uses elsewhere in this project) - it does not need a service account key.
 *
 * Usage:
 *   node scripts/send-test-notification.js --uid <uid> [--title "..."] [--body "..."] [--type accepted]
 *   node scripts/send-test-notification.js --email someone@example.com
 *
 * --email does a one-time full read of /users to resolve the uid (fine for this project's
 * user count; not meant for repeated/automated use).
 */

const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function resolveUidByEmail(email) {
  const raw = execFileSync('firebase', ['database:get', '/users'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
  const users = JSON.parse(raw);
  const match = Object.entries(users).find(([, u]) => u && u.email === email);
  if (!match) {
    throw new Error(`No user found with email ${email}`);
  }
  return match[0];
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.log([
      'Usage:',
      '  node scripts/send-test-notification.js --uid <uid> [--title "..."] [--body "..."] [--type accepted]',
      '  node scripts/send-test-notification.js --email someone@example.com',
    ].join('\n'));
    process.exit(0);
  }

  let uid = args.uid;
  if (!uid && args.email) {
    console.log(`Looking up uid for ${args.email}...`);
    uid = resolveUidByEmail(args.email);
    console.log(`Found: ${uid}`);
  }
  if (!uid) {
    console.error('Pass --uid <uid> or --email <email>. See --help.');
    process.exit(1);
  }

  const title = args.title || 'Test Notification';
  const body = args.body || 'This is a manual test push - no booking involved.';
  // Real enum values only (see database.rules.json) so this also renders correctly in the
  // app's own notification list, not just the push banner.
  const type = args.type || 'completed';

  const id = `test-${Date.now()}`;
  const payload = {
    title,
    body,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const path = `/Notifications/ByUser/${uid}/${id}`;
  console.log(`Writing ${path}:`, payload);

  execFileSync(
    'firebase',
    ['database:set', path, '-d', JSON.stringify(payload), '-f'],
    { stdio: 'inherit' }
  );

  console.log('\nWritten. sendPushOnNewNotification should fire within a few seconds if this user has an expoPushToken saved.');
  console.log(`Check delivery: firebase functions:log --only sendPushOnNewNotification -n 20`);
}

main();
