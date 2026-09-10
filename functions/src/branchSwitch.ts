import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { checkBranchCapacity } from "./capacity";

interface ReservationRecord {
  status?: string;
  branchId?: string;
  timeSlot?: { time?: string; appointmentDate?: string; estCompletion?: string };
  createdAt?: string;
}

// Duplicated from index.ts's own local findReservation rather than shared - this module is kept
// self-contained, matching how capacity.ts keeps its own date-parsing local too.
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

// A branch "offers" this time slot only if it's actually in that branch's own TimeSlots list -
// branches can run different hours, so bay capacity alone isn't enough to know a switch is valid.
async function branchOffersTimeSlot(branchId: string, time: string): Promise<boolean> {
  if (!time) return false;
  const snap = await admin.database().ref(`Branches/${branchId}/TimeSlots`).get();
  if (!snap.exists()) return false;
  const raw = snap.val();
  const slots: any[] = Array.isArray(raw) ? raw.filter(Boolean) : Object.values(raw);
  return slots.some((slot) => slot?.time === time && slot?.status !== "unavailable");
}

// Lists branches (other than the one currently holding the booking) that could actually accept
// it as-is: same time slot offered, and bay capacity available. The client only ever shows these
// as switch targets - moveBookingToBranch re-validates independently regardless, since branches
// can fill up between listing and confirming.
export const getSwitchableBranches = onCall(async (request) => {
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
  const { data: booking } = reservation;

  // Only a still-pending, not-yet-accepted booking is eligible to switch branches at all.
  if (booking.status !== "pending") {
    return { branchIds: [] };
  }

  const time = booking.timeSlot?.time ?? "";
  const datePath = booking.timeSlot?.appointmentDate ?? "";
  const estimatedMinutes = parseFloat(String(booking.timeSlot?.estCompletion ?? "0").replace(/[^\d.]/g, "")) || 0;

  const branchesSnap = await admin.database().ref("Branches").get();
  if (!branchesSnap.exists()) {
    return { branchIds: [] };
  }

  const candidateIds: string[] = [];
  branchesSnap.forEach((child) => {
    const archived = child.child("profile/archivedAt").exists();
    if (child.key && child.key !== booking.branchId && !archived) candidateIds.push(child.key);
    return false;
  });

  const eligible: string[] = [];
  await Promise.all(
    candidateIds.map(async (branchId) => {
      const offersSlot = await branchOffersTimeSlot(branchId, time);
      if (!offersSlot) return;
      const capacity = await checkBranchCapacity(branchId, datePath, time, estimatedMinutes);
      if (capacity.ok) eligible.push(branchId);
    })
  );

  return { branchIds: eligible };
});

// Moves a still-pending booking to a different branch - same appointment, same payment, only the
// branch assignment changes. Never trusts the client's target branch: re-verifies ownership,
// pending status, slot availability, and capacity fresh at call time, since any of those could
// have changed in the gap between the client listing eligible branches and confirming one.
export const moveBookingToBranch = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const appointmentId = request.data?.appointmentId;
  const newBranchId = request.data?.newBranchId;
  if (typeof appointmentId !== "string" || !appointmentId) {
    throw new HttpsError("invalid-argument", "appointmentId is required.");
  }
  if (typeof newBranchId !== "string" || !newBranchId) {
    throw new HttpsError("invalid-argument", "newBranchId is required.");
  }

  const reservation = await findReservation(uid, appointmentId);
  if (!reservation) {
    throw new HttpsError("not-found", "Booking not found.");
  }
  const { dateKey, data: booking } = reservation;

  if (booking.status !== "pending") {
    throw new HttpsError(
      "failed-precondition",
      "This booking is no longer waiting on a branch, so it can't be switched."
    );
  }
  if (newBranchId === booking.branchId) {
    throw new HttpsError("failed-precondition", "This booking is already at that branch.");
  }

  const newBranchSnap = await admin.database().ref(`Branches/${newBranchId}/profile`).get();
  if (!newBranchSnap.exists()) {
    throw new HttpsError("not-found", "Selected branch could not be found.");
  }
  const newBranchProfile = newBranchSnap.val();

  const time = booking.timeSlot?.time ?? "";
  const datePath = booking.timeSlot?.appointmentDate ?? dateKey;
  const estimatedMinutes = parseFloat(String(booking.timeSlot?.estCompletion ?? "0").replace(/[^\d.]/g, "")) || 0;

  const offersSlot = await branchOffersTimeSlot(newBranchId, time);
  if (!offersSlot) {
    throw new HttpsError("failed-precondition", "The selected branch doesn't offer this time slot.");
  }
  const capacity = await checkBranchCapacity(newBranchId, datePath, time, estimatedMinutes);
  if (!capacity.ok) {
    throw new HttpsError("failed-precondition", capacity.reason ?? "The selected branch is fully booked for this time.");
  }

  const oldBranchId = booking.branchId;
  const db = admin.database();

  // Carry over the original pendingBookings createdAt so switching branches can't be used to
  // reset expirePendingBookings' auto-expiry countdown - it tracks how long the booking itself
  // has been pending, not how long it's been sitting at any one particular branch.
  const oldPendingSnap = oldBranchId
    ? await db.ref(`Notifications/ByBranch/${oldBranchId}/pendingBookings/${appointmentId}`).get()
    : null;
  const originalCreatedAt = oldPendingSnap?.val()?.createdAt ?? booking.createdAt ?? new Date().toISOString();

  const updates: Record<string, unknown> = {
    [`Reservations/ReservationsByUser/${uid}/${dateKey}/${appointmentId}/branchId`]: newBranchId,
    [`Reservations/ReservationsByUser/${uid}/${dateKey}/${appointmentId}/branchName`]: newBranchProfile.name ?? "",
    [`Reservations/ReservationsByUser/${uid}/${dateKey}/${appointmentId}/branchAddress`]: newBranchProfile.address ?? "",
    [`Notifications/ByBranch/${newBranchId}/pendingBookings/${appointmentId}`]: {
      userId: uid,
      dateKey,
      appointmentId,
      branchId: newBranchId,
      branchName: newBranchProfile.name ?? "",
      createdAt: originalCreatedAt,
    },
  };
  if (oldBranchId) {
    updates[`Notifications/ByBranch/${oldBranchId}/pendingBookings/${appointmentId}`] = null;
  }

  // Single multi-path update so a dropped connection can't leave the old branch's pending list
  // and the new one inconsistent - matches the pattern already used for accept/cancel/complete.
  await db.ref().update(updates);

  return { branchName: newBranchProfile.name ?? "" };
});
