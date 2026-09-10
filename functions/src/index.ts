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
import { checkBranchCapacity, parseDateTime } from "./capacity";
import { sendPushOnNewNotification, notifyBranchStaffOfNewBooking } from "./pushNotifications";
import { getSwitchableBranches, moveBookingToBranch } from "./branchSwitch";

export { sendPushOnNewNotification, getSwitchableBranches, moveBookingToBranch };

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
    // Maya's own payment id (not our locally-generated requestReferenceNumber) - this is what
    // actually lets a receipt be reconciled against Maya's own dashboard/records.
    const mayaPaymentId = records.find((r) => r.status === MAYA_SUCCESS_STATUS)?.id;

    await db.ref(refPath).update({
      status: "succeeded",
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      ...(mayaPaymentId ? { mayaPaymentId } : {}),
    });
    const paidFields = {
      isPaid: true,
      paidAt: admin.database.ServerValue.TIMESTAMP,
      paymentMethod: "maya",
      ...(mayaPaymentId ? { mayaPaymentId } : {}),
    };
    await db
      .ref(`Reservations/ReservationsByUser/${record.userId}/${record.dateKey}/${record.appointmentId}`)
      .update(paidFields);
    // Also sync the branch-side copy - a booking already accepted (and thus copied into
    // ReservationsByBranch) before this webhook fires would otherwise permanently miss
    // isPaid/mayaPaymentId there, since nothing else re-syncs the two copies after that initial
    // copy-on-accept. Older payment records predate branchId being stored here, hence the guard.
    //
    // This path doesn't exist at all yet for a still-pending booking (admin's Pending tab reads
    // ReservationsByUser directly - ReservationsByBranch is only populated once accepted), and
    // the webhook typically fires right after checkout, well before an admin gets to accepting
    // it. update() on a non-existent path creates it with just these 4 fields, so this checks
    // existence first rather than risk writing a partial booking missing status/vehicleDetails/
    // timeSlot/etc.
    if (record.branchId) {
      const branchBookingRef = db.ref(
        `Reservations/ReservationsByBranch/${record.branchId}/${record.dateKey}/${record.appointmentId}`
      );
      const branchBookingSnap = await branchBookingRef.get();
      if (branchBookingSnap.exists()) {
        await branchBookingRef.update(paidFields);
      }

      // This is the moment the booking actually becomes real to staff - it's what the in-app
      // pending list/bell badge already gates on (see hooks/use-pending-branch-bookings.ts),
      // regardless of whether it's been accepted yet, so the push fires here too rather than
      // at raw booking-creation time (before checkout even starts).
      const branchNameSnap = await db.ref(`Branches/${record.branchId}/profile/name`).get();
      await notifyBranchStaffOfNewBooking(record.branchId, record.appointmentId, branchNameSnap.val() ?? null);
    }
  } else if (failed) {
    await db.ref(refPath).update({ status: "failed", updatedAt: admin.database.ServerValue.TIMESTAMP });
  }
  // else: still pending/processing - leave as-is, a later webhook call is expected.

  res.status(200).send("ok");
});

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
// Client-confirmed policy: a paid-but-unaccepted booking gets 24 hours of the branch's actual
// operating time to be reviewed - not 24 wall-clock hours, since a booking placed at 9pm hasn't
// "used up" any of that budget by 7am the next open-day. See openHoursElapsedMs below.
const PENDING_OPEN_HOURS_BUDGET_MS = 24 * 60 * 60 * 1000;
// Independent hard override: if a paid booking is still pending this close to its own scheduled
// time, cancel it outright regardless of the open-hours budget above. This is what keeps that
// generous budget from ever leaving a customer standing at the branch with an unconfirmed
// booking - most notably for a booking against the very first slot of the day, where the
// open-hours budget hasn't even started ticking yet by the time the appointment arrives.
const APPOINTMENT_CANCEL_BUFFER_MS = 30 * 60 * 1000;
const AUTO_CANCEL_REASON = "Branch might be too busy to accommodate your request at this time.";
const APPOINTMENT_BUFFER_CANCEL_REASON = "Your booking wasn't confirmed in time before your appointment, so it was cancelled.";
const PAYMENT_TIMEOUT_REASON = "Payment wasn't completed in time, so the slot was released.";

// Branch schedule is stored as a single string like "8:00 AM - 6:00 PM" (see Branches/{id}/
// profile/schedule) - mirrors ServicesStep.tsx's own parsing, kept local since that one runs
// client-side.
function parseScheduleHours(schedule: string | undefined | null): { openHour: number; closeHour: number } | null {
  if (!schedule) return null;
  const match = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  const to24Hour = (hourStr: string, period: string): number => {
    let hour = parseInt(hourStr, 10);
    const p = period.toUpperCase();
    if (p === "PM" && hour !== 12) hour += 12;
    else if (p === "AM" && hour === 12) hour = 0;
    return hour;
  };
  return { openHour: to24Hour(match[1], match[3]), closeHour: to24Hour(match[4], match[6]) };
}

// Sums the time that actually fell within a branch's daily [openHour, closeHour) window between
// two timestamps - a booking placed at 9pm and reviewed at 8am the next open-day has accrued
// zero "open" time overnight, not 11 hours.
function openHoursElapsedMs(fromMs: number, toMs: number, openHour: number, closeHour: number): number {
  if (toMs <= fromMs || closeHour <= openHour) return 0;

  let elapsedMs = 0;
  const cursor = new Date(fromMs);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(toMs);
  endDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= endDay.getTime()) {
    const dayOpen = new Date(cursor);
    dayOpen.setHours(openHour, 0, 0, 0);
    const dayClose = new Date(cursor);
    dayClose.setHours(closeHour, 0, 0, 0);

    const windowStart = Math.max(dayOpen.getTime(), fromMs);
    const windowEnd = Math.min(dayClose.getTime(), toMs);
    if (windowEnd > windowStart) elapsedMs += windowEnd - windowStart;

    cursor.setDate(cursor.getDate() + 1);
  }

  return elapsedMs;
}

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
  appointmentId: string,
  reason: string
): Promise<void> {
  const db = admin.database();
  const cancelledAt = new Date().toISOString();

  const userBookingRef = db.ref(`Reservations/ReservationsByUser/${userId}/${dateKey}/${appointmentId}`);
  const bookingData = (await userBookingRef.get()).val();

  await userBookingRef.update({
    status: "cancelled",
    cancelReason: reason,
    cancelledAt,
    cancelledBy: "system",
    refundEligible: true,
  });

  if (bookingData) {
    await db.ref(`Reservations/ReservationsByBranch/${branchId}/${dateKey}/${appointmentId}`).set({
      ...bookingData,
      status: "cancelled",
      cancelReason: reason,
      cancelledAt,
      cancelledBy: "system",
      refundEligible: true,
    });
  }

  await notifyUser(userId, branchId, {
    title: "Booking Automatically Cancelled",
    body: `Your appointment (${appointmentId}) was automatically cancelled. ${reason}`,
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
//
// Three different thresholds share this one pass:
// - An unpaid hold (customer never finished Maya checkout) releases after PAYMENT_WINDOW_MS,
//   wall-clock, so the slot doesn't sit locked up waiting on a payment that isn't coming.
// - A paid-but-unaccepted booking gets PENDING_OPEN_HOURS_BUDGET_MS worth of the branch's actual
//   operating hours (not wall-clock) - no urgency to free a slot the branch has already been
//   paid to hold, and nobody should be expected to act on it overnight.
// - Regardless of that budget, APPOINTMENT_CANCEL_BUFFER_MS before the booking's own scheduled
//   time is a hard override - this is what stops a customer ever showing up to an unconfirmed
//   booking, including for a booking against the very first slot of the day (where the
//   open-hours budget may not have started ticking at all yet).
// Runs every 5 minutes (rather than every 15) so the 15-minute payment window stays reasonably
// tight in practice.
export const expirePendingBookings = onSchedule(
  { schedule: "every 5 minutes", secrets: ALL_MAYA_SECRETS },
  async () => {
    const db = admin.database();
    const branchesSnap = await db.ref("Notifications/ByBranch").get();
    if (!branchesSnap.exists()) return;

    const now = Date.now();
    const tasks: Promise<void>[] = [];

    // One schedule fetch per branch, shared by every pending booking under it (not one per
    // booking) - concurrent tasks for the same branch await the same cached promise.
    const scheduleCache = new Map<string, Promise<{ openHour: number; closeHour: number } | null>>();
    const getBranchSchedule = (branchId: string) => {
      let cached = scheduleCache.get(branchId);
      if (!cached) {
        cached = db
          .ref(`Branches/${branchId}/profile/schedule`)
          .get()
          .then((snap) => parseScheduleHours(snap.val()));
        scheduleCache.set(branchId, cached);
      }
      return cached;
    };

    branchesSnap.forEach((branchSnap) => {
      const branchId = branchSnap.key as string;
      const pending = branchSnap.child("pendingBookings");
      pending.forEach((entrySnap) => {
        const data = entrySnap.val();
        if (!data?.createdAt || !data.userId || !data.dateKey || !data.appointmentId) return false;

        const createdAtMs = new Date(data.createdAt).getTime();
        const ageMs = now - createdAtMs;
        tasks.push(
          (async () => {
            const bookingSnap = await db
              .ref(`Reservations/ReservationsByUser/${data.userId}/${data.dateKey}/${data.appointmentId}`)
              .get();
            const bookingData = bookingSnap.val();
            const isPaid = bookingData?.isPaid === true;

            if (!isPaid) {
              if (ageMs > PAYMENT_WINDOW_MS) {
                await expireOnePendingBooking(branchId, data.userId, data.dateKey, data.appointmentId, PAYMENT_TIMEOUT_REASON);
              }
              return;
            }

            // No parseable schedule - fail open to plain wall-clock counting rather than let
            // missing/malformed branch data block expiry entirely.
            const schedule = await getBranchSchedule(branchId);
            const openHoursElapsed = schedule
              ? openHoursElapsedMs(createdAtMs, now, schedule.openHour, schedule.closeHour)
              : ageMs;
            const openHoursExpired = openHoursElapsed > PENDING_OPEN_HOURS_BUDGET_MS;

            const appointmentDate = bookingData?.timeSlot?.appointmentDate;
            const appointmentTime = bookingData?.timeSlot?.time;
            const appointmentBufferExpired =
              !!appointmentDate &&
              !!appointmentTime &&
              now >= parseDateTime(appointmentDate, appointmentTime).getTime() - APPOINTMENT_CANCEL_BUFFER_MS;

            if (!openHoursExpired && !appointmentBufferExpired) return;

            await expireOnePendingBooking(
              branchId,
              data.userId,
              data.dateKey,
              data.appointmentId,
              appointmentBufferExpired ? APPOINTMENT_BUFFER_CANCEL_REASON : AUTO_CANCEL_REASON
            );
          })().catch((err) => {
            logger.error("Failed to expire pending booking", { branchId, appointmentId: data.appointmentId, err });
          })
        );
        return false;
      });
      return false;
    });

    await Promise.all(tasks);
  }
);

const REMINDER_LEAD_MS = 30 * 60 * 1000;

// Nudges a customer shortly before their confirmed appointment - partly a nice touch, partly a
// practical no-show reducer (Confirmed -> Ongoing now has zero manual gate, see
// autoStartTodayBookings in AppointmentsList.tsx, so a customer who simply forgot is the main
// failure mode worth heading off). `reminderSentAt` on the booking is the dedupe guard against
// re-sending on every 5-minute tick; only "accepted" bookings qualify - a still-pending one
// hasn't even been confirmed by the branch yet, so reminding about it would be premature.
export const sendAppointmentReminders = onSchedule(
  { schedule: "every 5 minutes" },
  async () => {
    const db = admin.database();
    const branchesSnap = await db.ref("Reservations/ReservationsByBranch").get();
    if (!branchesSnap.exists()) return;

    const now = Date.now();
    const tasks: Promise<void>[] = [];

    branchesSnap.forEach((branchSnap) => {
      const branchId = branchSnap.key as string;

      branchSnap.forEach((dateSnap) => {
        const dateKey = dateSnap.key as string;

        dateSnap.forEach((bookingSnap) => {
          const booking = bookingSnap.val();
          if (!booking || booking.status !== "accepted" || booking.reminderSentAt || !booking.userId) return false;

          const appointmentAt = parseDateTime(booking.timeSlot?.appointmentDate, booking.timeSlot?.time).getTime();
          if (appointmentAt <= now || appointmentAt - now > REMINDER_LEAD_MS) return false;

          tasks.push(
            (async () => {
              await db
                .ref(`Reservations/ReservationsByBranch/${branchId}/${dateKey}/${bookingSnap.key}/reminderSentAt`)
                .set(new Date().toISOString());

              await notifyUser(booking.userId, branchId, {
                title: "Your Appointment is Coming Up",
                body: `Your wash at ${booking.branchName || "the branch"} is scheduled for ${booking.timeSlot?.time}. We'll be ready for you!`,
                appointmentId: booking.appointmentId,
                date: booking.timeSlot?.appointmentDate,
                type: "reminder",
                read: false,
                createdAt: new Date().toISOString(),
              });
            })().catch((err) => {
              logger.error("Failed to send appointment reminder", { branchId, appointmentId: booking.appointmentId, err });
            })
          );
          return false;
        });
        return false;
      });
      return false;
    });

    await Promise.all(tasks);
  }
);
