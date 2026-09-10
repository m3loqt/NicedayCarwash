import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onValueCreated } from "firebase-functions/v2/database";

// Shared by every push-sending trigger below. Includes `sound: "default"` so a notification
// actually plays a sound instead of arriving silently - the Android channel (see
// ensureAndroidNotificationChannel in lib/pushNotifications.ts) only configures *what* sound to
// use, this `sound` field on the message itself is what tells Expo/APNs/FCM to play one at all.
async function sendExpoPush(
  userId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  let result: any;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default", data }),
    });
    result = await response.json().catch(() => null);
    if (!response.ok) {
      logger.error("Expo push send failed", { userId, status: response.status, result });
    }
  } catch (err) {
    logger.error("Expo push send threw", { userId, err });
    return;
  }

  // Token is permanently invalid (uninstalled app, etc.) - clear it so we stop retrying.
  if (result?.data?.details?.error === "DeviceNotRegistered") {
    await admin.database().ref(`users/${userId}/expoPushToken`).remove();
  }
}

// Trigger point for per-user push delivery. Every existing notification write - the four
// client-side handlers in AppointmentsList.tsx (accept/complete/cancel/no-show) and the
// server-side notifyUser() helper used by expirePendingBookings - lands under
// Notifications/ByUser/{userId}/{notificationId}, so this one trigger covers every case with
// no changes needed at any of those call sites.
export const sendPushOnNewNotification = onValueCreated(
  "/Notifications/ByUser/{userId}/{notificationId}",
  async (event) => {
    const { userId } = event.params;
    const notification = event.data.val();
    if (!notification) return;

    const tokenSnap = await admin.database().ref(`users/${userId}/expoPushToken`).get();
    const token = tokenSnap.val();
    if (!token) return; // user skipped/denied notification permission - nothing to send

    await sendExpoPush(userId, token, notification.title, notification.body, {
      // `date` lets the app deep-link straight to the booking-progress screen on tap (it keys
      // the RTDB path). Not every notification carries it - server-sent ones don't - so the
      // client falls back to the notifications list when it's absent.
      appointmentId: notification.appointmentId,
      type: notification.type,
      date: notification.date ?? null,
    });
  }
);

// Alerts a branch's admin/supervisor accounts once a customer's booking is actually paid -
// called directly from mayaWebhook's succeeded branch (functions/src/index.ts), not from a
// trigger on Notifications/ByBranch/{branchId}/pendingBookings creation. That path gets written
// the moment ConfirmationStep.tsx creates the booking, well before checkout even starts - a
// trigger there would buzz a supervisor's phone for a booking whose payment never completes.
// isPaid is exactly the condition the in-app pending list/bell badge already gates on
// (see hooks/use-pending-branch-bookings.ts), so this fires at the same moment that list would
// actually show the booking.
//
// Branch staff aren't looked up by a single known uid the way sendPushOnNewNotification's target
// is, so this queries `users` by branch instead (needs the .indexOn in database.rules.json - the
// Admin SDK isn't rule-restricted, but the index keeps this fast as the user table grows). Every
// admin screen that reads a staff account's branch falls back from branchId to the legacy
// `branch` field (see e.g. AppointmentsList.tsx's `userData.branchId || userData.branch`), so
// this queries both and merges rather than risking silently skipping anyone still on the old
// field.
export async function notifyBranchStaffOfNewBooking(
  branchId: string,
  appointmentId: string,
  branchName: string | null
): Promise<void> {
  const usersRef = admin.database().ref("users");
  const [byBranchId, byBranch] = await Promise.all([
    usersRef.orderByChild("branchId").equalTo(branchId).get(),
    usersRef.orderByChild("branch").equalTo(branchId).get(),
  ]);

  const staffById = new Map<string, any>();
  [byBranchId, byBranch].forEach((snap) => {
    snap.forEach((child) => {
      if (child.key) staffById.set(child.key, child.val());
    });
  });
  if (staffById.size === 0) return;

  const title = "New Booking Request";
  const body = branchName
    ? `A new booking is waiting for confirmation at ${branchName}.`
    : "A new booking is waiting for confirmation.";

  const sends: Promise<void>[] = [];
  staffById.forEach((staff, uid) => {
    const isStaffRole = staff?.role === "admin" || staff?.role === "supervisor" || staff?.role === "superadmin";
    if (isStaffRole && staff?.expoPushToken) {
      sends.push(
        sendExpoPush(uid, staff.expoPushToken, title, body, {
          appointmentId,
          type: "new_booking",
          branchId,
        })
      );
    }
  });
  await Promise.all(sends);
}
