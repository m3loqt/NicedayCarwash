import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import {
  activeSecretKey,
  fetchPaymentsByReferenceNumber,
  MAYA_SUCCESS_STATUS,
  refundMayaPayment,
} from "./maya";

export interface RefundOutcome {
  refunded: boolean;
  reason?: string;
}

// Shared by both the admin-triggered refundBookingFee callable and the scheduled expiry job, so
// there is exactly one place that decides whether money actually moves. Never trusts the caller's
// claim that a cancellation is refund-eligible - always re-checks the reservation record itself.
export async function performRefund(appointmentId: string): Promise<RefundOutcome> {
  const db = admin.database();

  let refKey: string | null = (await db.ref(`Payments/ByAppointment/${appointmentId}`).get()).val();
  if (!refKey) {
    // Fallback for payment records created before the reverse index existed.
    const snap = await db
      .ref("Payments/ByReference")
      .orderByChild("appointmentId")
      .equalTo(appointmentId)
      .get();
    snap.forEach((child) => {
      refKey = child.key;
      return true;
    });
  }
  if (!refKey) return { refunded: false, reason: "no-payment-record" };

  const paymentSnap = await db.ref(`Payments/ByReference/${refKey}`).get();
  const payment = paymentSnap.val();
  if (!payment) return { refunded: false, reason: "no-payment-record" };
  if (payment.status === "refunded") return { refunded: true };
  if (payment.status !== "succeeded") return { refunded: false, reason: "not-succeeded" };

  const reservationRef = db.ref(
    `Reservations/ReservationsByUser/${payment.userId}/${payment.dateKey}/${appointmentId}`
  );
  const reservation = (await reservationRef.get()).val();
  if (!reservation || reservation.status !== "cancelled" || reservation.refundEligible !== true) {
    return { refunded: false, reason: "not-refund-eligible" };
  }

  let records;
  try {
    records = await fetchPaymentsByReferenceNumber(activeSecretKey(), refKey);
  } catch (err) {
    logger.error("Failed to look up Maya payment for refund", err);
    return { refunded: false, reason: "maya-lookup-failed" };
  }
  const succeeded = records.find((r) => r.status === MAYA_SUCCESS_STATUS);
  if (!succeeded?.id) return { refunded: false, reason: "maya-payment-id-not-found" };

  try {
    const result = await refundMayaPayment(
      activeSecretKey(),
      succeeded.id,
      payment.amount,
      "Booking cancelled - branch caused"
    );
    await db.ref(`Payments/ByReference/${refKey}`).update({
      status: "refunded",
      refundedAt: admin.database.ServerValue.TIMESTAMP,
      refundId: result.refundId ?? null,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    await reservationRef.update({
      refundStatus: "refunded",
      refundedAt: admin.database.ServerValue.TIMESTAMP,
    });
    if (payment.branchId) {
      await db
        .ref(`Reservations/ReservationsByBranch/${payment.branchId}/${payment.dateKey}/${appointmentId}`)
        .update({ refundStatus: "refunded", refundedAt: admin.database.ServerValue.TIMESTAMP });
    }
    return { refunded: true };
  } catch (err) {
    logger.error("Maya refund call failed", err);
    await db.ref(`Payments/ByReference/${refKey}`).update({
      status: "refund_failed",
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
    await reservationRef.update({ refundStatus: "failed" });
    return { refunded: false, reason: "maya-refund-call-failed" };
  }
}
