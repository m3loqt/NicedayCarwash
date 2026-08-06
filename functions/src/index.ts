import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  activePublicKey,
  activeSecretKey,
  createMayaCheckout,
  fetchPaymentsByReferenceNumber,
  MAYA_SUCCESS_STATUS,
  MAYA_TERMINAL_FAILURE_STATUSES,
  mayaEnvironment,
  mayaLivePublicKey,
  mayaLiveSecretKey,
  mayaSandboxPublicKey,
  mayaSandboxSecretKey,
} from "./maya";
import { performRefund } from "./refunds";
import { checkBranchCapacity } from "./capacity";
import { sendPushOnNewNotification } from "./pushNotifications";

export { sendPushOnNewNotification };

// Both key pairs must be declared here even though only one is read at runtime (per MAYA_ENVIRONMENT) -
// Cloud Functions v2 needs every secret a function might touch listed at deploy time.
const ALL_MAYA_SECRETS = [mayaLivePublicKey, mayaLiveSecretKey, mayaSandboxPublicKey, mayaSandboxSecretKey, mayaEnvironment];

admin.initializeApp();

// Flat online deposit charged through PaymentPage - matches the client's hardcoded bookingFee,
// NOT booking.amountDue (that also includes services/add-ons settled in person after service).
const BOOKING_FEE = 25.0;
// Maya rejects custom-scheme redirectUrl values ("must be a valid url") - confirmed against the
// sandbox API directly - so Checkout is given this HTTPS bridge instead. It does NOT attempt to
// bounce back into the app via a custom scheme deep link: on Android the same incoming link can
// reach both the client-side listener and Expo Router's own linking handler in parallel, and
// Router "winning" that race repeatedly clobbered the real post-payment navigation. The client
// (lib/mayaPayment.ts) just waits for the user to close this browser tab manually instead, then
// checks payment status - isPaid is only ever trusted from the webhook-verified DB state anyway.
const FUNCTIONS_BASE_URL = "https://us-central1-ndcw-12f99.cloudfunctions.net";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ReservationRecord {
  status?: string;
  isPaid?: boolean;
  branchId?: string;
}

async function findReservation(
  uid: string,
  appointmentId: string
): Promise<{ dateKey: string; data: ReservationRecord } | null> {
  const snapshot = await admin.database().ref(`Reservations/ReservationsByUser/${uid}`).get();
  if (!snapshot.exists()) return null;

  let found: { dateKey: string; data: ReservationRecord } | null = null;
  snapshot.forEach((dateSnap) => {
    const bookingSnap = dateSnap.child(appointmentId);
    if (bookingSnap.exists()) {
      found = { dateKey: dateSnap.key as string, data: bookingSnap.val() };
      return true;
    }
    return false;
  });
  return found;
}

export const createCheckout = onCall({ secrets: ALL_MAYA_SECRETS }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const appointmentId = request.data?.appointmentId;
  if (typeof appointmentId !== "string" || !appointmentId) {
    throw new HttpsError("invalid-argument", "appointmentId is required.");
  }

  const reservation = await findReservation(uid, appointmentId);
  if (!reservation) {
    throw new HttpsError("not-found", "Booking not found.");
  }
  const { dateKey, data: booking } = reservation;
  // Read from the reservation record itself rather than requiring every client call site to pass
  // it - older reservations created before branchId was stored on the record just won't have it,
  // which only means a refund can't also update ReservationsByBranch (see performRefund).
  const branchId = booking.branchId;

  if (booking.isPaid) {
    throw new HttpsError("failed-precondition", "This booking has already been paid.");
  }
  if (booking.status !== "pending" && booking.status !== "accepted") {
    throw new HttpsError("failed-precondition", "This booking is not eligible for payment at this stage.");
  }

  const requestReferenceNumber = `${appointmentId}-${Date.now()}`;
  const db = admin.database();

  let checkout;
  try {
    checkout = await createMayaCheckout(activePublicKey(), {
      requestReferenceNumber,
      amount: BOOKING_FEE,
      description: `Booking fee - ${appointmentId}`,
      redirectUrl: {
        success: `${FUNCTIONS_BASE_URL}/paymentReturn?ref=${encodeURIComponent(requestReferenceNumber)}&result=success`,
        failure: `${FUNCTIONS_BASE_URL}/paymentReturn?ref=${encodeURIComponent(requestReferenceNumber)}&result=failure`,
        cancel: `${FUNCTIONS_BASE_URL}/paymentReturn?ref=${encodeURIComponent(requestReferenceNumber)}&result=cancel`,
      },
    });
  } catch (err) {
    logger.error("createMayaCheckout failed", err);
    throw new HttpsError("internal", "Could not start payment. Please try again.");
  }

  await db.ref(`Payments/ByReference/${requestReferenceNumber}`).set({
    provider: "maya",
    userId: uid,
    dateKey,
    appointmentId,
    branchId: branchId ?? null,
    amount: BOOKING_FEE,
    currency: "PHP",
    checkoutId: checkout.checkoutId,
    status: "pending",
    createdAt: admin.database.ServerValue.TIMESTAMP,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  });
  // Reverse index so a refund lookup by appointmentId doesn't need to scan all payment records.
  await db.ref(`Payments/ByAppointment/${appointmentId}`).set(requestReferenceNumber);

  return { redirectUrl: checkout.redirectUrl, requestReferenceNumber };
});

// Admin-triggered refund for a cancelled, refund-eligible booking. Re-checks eligibility itself
// (performRefund never trusts the caller) - this is just an auth/role gate plus a thin wrapper.
export const refundBookingFee = onCall({ secrets: ALL_MAYA_SECRETS }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const roleSnap = await admin.database().ref(`users/${uid}/role`).get();
  const role = roleSnap.val();
  if (role !== "admin" && role !== "supervisor" && role !== "superadmin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }

  const appointmentId = request.data?.appointmentId;
  if (typeof appointmentId !== "string" || !appointmentId) {
    throw new HttpsError("invalid-argument", "appointmentId is required.");
  }

  const result = await performRefund(appointmentId);
  if (!result.refunded) {
    throw new HttpsError("failed-precondition", result.reason ?? "Refund could not be completed.");
  }
  return result;
});

// Customer-facing pre-payment capacity check. Runs server-side because
// Reservations/ReservationsByBranch is admin/supervisor-only under the RTDB rules - a customer's
// client SDK call would get permission-denied reading it directly.
export const checkCapacity = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { branchId, datePath, time, estimatedMinutes } = request.data ?? {};
  if (typeof branchId !== "string" || !branchId) {
    throw new HttpsError("invalid-argument", "branchId is required.");
  }
  if (typeof datePath !== "string" || !datePath) {
    throw new HttpsError("invalid-argument", "datePath is required.");
  }
  if (typeof time !== "string" || !time) {
    throw new HttpsError("invalid-argument", "time is required.");
  }
  if (typeof estimatedMinutes !== "number" || estimatedMinutes < 0) {
    throw new HttpsError("invalid-argument", "estimatedMinutes must be a non-negative number.");
  }

  return checkBranchCapacity(branchId, datePath, time, estimatedMinutes);
});

// HTTPS landing page Maya redirects to after checkout. Deliberately does NOT attempt to deep-link
// back into the app - see the FUNCTIONS_BASE_URL comment above for why. Just tells the user to
// close the tab; the app is already polling for the webhook-confirmed result independently.
export const paymentReturn = onRequest((req, res) => {
  const result = typeof req.query.result === "string" ? req.query.result : "unknown";
  const messages: Record<string, string> = {
    success: "Payment received. You can close this window and return to the app.",
    failure: "Payment failed. You can close this window and try again in the app.",
    cancel: "Payment cancelled. You can close this window and return to the app.",
  };
  const message = escapeHtml(messages[result] ?? "You can close this window and return to the app.");

  res.set("Content-Type", "text/html");
  res.status(200).send(`<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="font-family: -apple-system, sans-serif; text-align: center; padding-top: 3rem;">
    <p>${message}</p>
  </body>
</html>`);
});

export const mayaWebhook = onRequest({ secrets: ALL_MAYA_SECRETS }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const payload = req.body ?? {};
  const requestReferenceNumber: string | undefined =
    payload.requestReferenceNumber ??
    payload.data?.requestReferenceNumber ??
    payload.paymentRequestReferenceNumber;

  if (!requestReferenceNumber) {
    logger.warn("Maya webhook missing requestReferenceNumber", { payload });
    res.status(200).send("ignored");
    return;
  }

  const db = admin.database();
  const refPath = `Payments/ByReference/${requestReferenceNumber}`;
  const recordSnap = await db.ref(refPath).get();
  if (!recordSnap.exists()) {
    logger.warn("Maya webhook for unknown reference", { requestReferenceNumber });
    res.status(200).send("ignored");
    return;
  }
  const record = recordSnap.val();

  if (record.status === "succeeded" || record.status === "failed") {
    // Already resolved - Maya retries webhooks, ack without redoing work.
    res.status(200).send("ok");
    return;
  }

  let records;
  try {
    records = await fetchPaymentsByReferenceNumber(activeSecretKey(), requestReferenceNumber);
  } catch (err) {
    logger.error("Failed to verify Maya payment status", err);
    res.status(500).send("verification failed");
    return;
  }

  const succeeded = records.some((r) => r.status === MAYA_SUCCESS_STATUS);
  const failed = !succeeded && records.some((r) => r.status && MAYA_TERMINAL_FAILURE_STATUSES.includes(r.status));

  if (succeeded) {
    await db.ref(refPath).update({ status: "succeeded", updatedAt: admin.database.ServerValue.TIMESTAMP });
    await db
      .ref(`Reservations/ReservationsByUser/${record.userId}/${record.dateKey}/${record.appointmentId}`)
      .update({
        isPaid: true,
        paidAt: admin.database.ServerValue.TIMESTAMP,
        paymentMethod: "maya",
      });
  } else if (failed) {
    await db.ref(refPath).update({ status: "failed", updatedAt: admin.database.ServerValue.TIMESTAMP });
  }
  // else: still pending/processing - leave as-is, a later webhook call is expected.

  res.status(200).send("ok");
});

const PENDING_EXPIRY_MS = 24 * 60 * 60 * 1000;
const AUTO_CANCEL_REASON = "Branch might be too busy to accommodate your request at this time.";

async function notifyUser(userId: string, branchId: string, payload: Record<string, unknown>): Promise<void> {
  const db = admin.database();
  await Promise.all([
    db.ref(`Notifications/ByBranch/${branchId}/userNotifications/${userId}`).push(payload),
    db.ref(`Notifications/ByUser/${userId}`).push(payload),
  ]);
}

async function expireOnePendingBooking(
  branchId: string,
  userId: string,
  dateKey: string,
  appointmentId: string
): Promise<void> {
  const db = admin.database();
  const cancelledAt = new Date().toISOString();

  const userBookingRef = db.ref(`Reservations/ReservationsByUser/${userId}/${dateKey}/${appointmentId}`);
  const bookingData = (await userBookingRef.get()).val();

  await userBookingRef.update({
    status: "cancelled",
    cancelReason: AUTO_CANCEL_REASON,
    cancelledAt,
    cancelledBy: "system",
    refundEligible: true,
  });

  if (bookingData) {
    await db.ref(`Reservations/ReservationsByBranch/${branchId}/${dateKey}/${appointmentId}`).set({
      ...bookingData,
      status: "cancelled",
      cancelReason: AUTO_CANCEL_REASON,
      cancelledAt,
      cancelledBy: "system",
      refundEligible: true,
    });
  }

  await notifyUser(userId, branchId, {
    title: "Booking Automatically Cancelled",
    body: `Your appointment (${appointmentId}) was automatically cancelled. ${AUTO_CANCEL_REASON}`,
    appointmentId,
    type: "cancelled",
    read: false,
    createdAt: cancelledAt,
  });

  await db.ref(`Notifications/ByBranch/${branchId}/pendingBookings/${appointmentId}`).remove();

  if (bookingData?.isPaid) {
    const result = await performRefund(appointmentId);
    if (!result.refunded) {
      logger.warn("Auto-expiry refund did not complete", { appointmentId, reason: result.reason });
    }
  }
}

// Replaces the old client-side auto-decline (which only ran if an admin happened to have the
// Appointments screen open) - this now has real refund consequences, so it can't depend on that.
export const expirePendingBookings = onSchedule(
  { schedule: "every 15 minutes", secrets: ALL_MAYA_SECRETS },
  async () => {
    const db = admin.database();
    const branchesSnap = await db.ref("Notifications/ByBranch").get();
    if (!branchesSnap.exists()) return;

    const now = Date.now();
    const tasks: Promise<void>[] = [];

    branchesSnap.forEach((branchSnap) => {
      const branchId = branchSnap.key as string;
      const pending = branchSnap.child("pendingBookings");
      pending.forEach((entrySnap) => {
        const data = entrySnap.val();
        if (data?.createdAt && now - new Date(data.createdAt).getTime() > PENDING_EXPIRY_MS) {
          tasks.push(
            expireOnePendingBooking(branchId, data.userId, data.dateKey, data.appointmentId).catch((err) => {
              logger.error("Failed to expire pending booking", { branchId, appointmentId: data.appointmentId, err });
            })
          );
        }
        return false;
      });
      return false;
    });

    await Promise.all(tasks);
  }
);
