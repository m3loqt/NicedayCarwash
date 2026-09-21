import * as admin from "firebase-admin";

export interface CapacityCheckResult {
  ok: boolean;
  reason?: string;
}

// The whole app (bookings created client-side, branch schedules, "today") runs on Philippines
// wall-clock time, but Cloud Functions Gen2 containers run with TZ=UTC regardless of deployed
// region - so `new Date(year, month-1, day, hours, minutes)` here was silently treating "8:00 AM"
// as 8:00 AM UTC (= 4:00 PM Manila), an 8-hour skew against the real appointment time. Every
// caller that compares the result against Date.now() (expirePendingBookings' appointment-buffer
// check, sendAppointmentReminders, autoStartAcceptedBookings, autoCompleteOngoingBookings) needs
// the real UTC instant of that Manila wall-clock moment, so this builds it explicitly instead of
// relying on the server process's local timezone. (checkBranchCapacity only ever diffs two
// parseDateTime results against each other, so it was never affected by this - a constant offset
// cancels out of a relative comparison.)
const MANILA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

// Mirrors ConfirmationStep/AppointmentsList's own date-time parsing (MM-DD-YYYY + "8:00 AM" etc.)
// Kept local rather than shared - this runs server-side, those run client-side. Exported for
// expirePendingBookings (index.ts), which needs the same MM-DD-YYYY + "8:00 AM" parsing to check
// a booking's own scheduled time.
export function parseDateTime(appointmentDate: string, time: string): Date {
  const [month, day, year] = (appointmentDate || "").split("-").map(Number);
  if (!month || !day || !year) return new Date();

  let hours = 0;
  let minutes = 0;

  if (time) {
    const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = parseInt(ampmMatch[2], 10);
      const meridiem = ampmMatch[3].toUpperCase();
      if (meridiem === "PM" && hours !== 12) hours += 12;
      else if (meridiem === "AM" && hours === 12) hours = 0;
    } else {
      const colonMatch = time.match(/(\d{1,2}):(\d{2})/);
      if (colonMatch) {
        hours = parseInt(colonMatch[1], 10);
        minutes = parseInt(colonMatch[2], 10);
      } else {
        const numMatch = time.match(/^(\d{1,2})$/);
        if (numMatch) hours = parseInt(numMatch[1], 10);
      }
    }
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - MANILA_UTC_OFFSET_MS);
}

// `startedAt`/`completedAt` on a booking may have been written by this server (a real UTC ISO
// string, ending in "Z") or by the client's own toLocalISOString (AppointmentsList.tsx) - which
// formats Philippines wall-clock components with no timezone suffix at all, since the device
// itself is already in that timezone. Treat anything without a trailing offset as Manila local
// time so both origins compare correctly against real elapsed time.
export function parseStoredTimestamp(value: string): number {
  if (!value) return NaN;
  if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value).getTime();

  const [datePart, timePart = "00:00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hh, mm, ss] = timePart.split(":").map((n) => parseFloat(n));
  return Date.UTC(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, Math.floor(ss || 0)) - MANILA_UTC_OFFSET_MS;
}

function countUsableBays(baysData: any): number {
  if (!baysData) return 0;
  const bays: any[] = Array.isArray(baysData) ? baysData.filter(Boolean) : Object.values(baysData);
  return bays.filter((bay) => bay?.status !== "maintenance").length;
}

// Server-side because Reservations/ReservationsByBranch is admin/supervisor-only under the RTDB
// rules - a customer's client SDK call would get permission-denied reading it directly. This is a
// soft, conservative pre-payment check (not a hard guarantee - actual duration varies by vehicle
// condition, so bay assignment itself stays a manual admin decision).
export async function checkBranchCapacity(
  branchId: string,
  datePath: string,
  time: string,
  estimatedMinutes: number
): Promise<CapacityCheckResult> {
  const db = admin.database();

  const [baysSnap, dayBookingsSnap] = await Promise.all([
    db.ref(`Branches/${branchId}/Bays`).get(),
    db.ref(`Reservations/ReservationsByBranch/${branchId}/${datePath}`).get(),
  ]);

  const totalUsableBays = countUsableBays(baysSnap.val());
  if (totalUsableBays <= 0) {
    // No bay data configured yet for this branch — don't block booking on missing admin setup.
    return { ok: true };
  }

  const requestedStart = parseDateTime(datePath, time);
  const requestedEnd = new Date(requestedStart.getTime() + estimatedMinutes * 60000);

  let overlapping = 0;
  dayBookingsSnap.forEach((snap) => {
    const data = snap.val();
    if (!data || !["pending", "accepted", "ongoing"].includes(data.status)) return false;

    const start = parseDateTime(data.timeSlot?.appointmentDate || datePath, data.timeSlot?.time || "");
    const minutes = parseFloat(String(data.timeSlot?.estCompletion || "0").replace(/[^\d.]/g, "")) || 0;
    const end = new Date(start.getTime() + minutes * 60000);

    if (requestedStart < end && requestedEnd > start) overlapping += 1;
    return false;
  });

  if (overlapping >= totalUsableBays) {
    return {
      ok: false,
      reason: "This branch appears fully booked for the requested time. Please choose another slot.",
    };
  }
  return { ok: true };
}
