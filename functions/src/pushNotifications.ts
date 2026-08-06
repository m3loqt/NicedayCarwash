import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onValueCreated } from "firebase-functions/v2/database";

// Single trigger point for ALL push delivery. Every existing notification write - the four
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

    let result: any;
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          to: token,
          title: notification.title,
          body: notification.body,
          data: { appointmentId: notification.appointmentId, type: notification.type },
        }),
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
);
