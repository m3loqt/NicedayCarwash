import { auth, db } from '@/firebase/firebase';
import { logError } from '@/lib/logger';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

export interface PendingBranchBooking {
  appointmentId: string;
  createdAt: string;
  timeSlot: { appointmentDate: string; time: string };
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
}

// Supervisor-facing equivalent of the customer Notifications/ByUser feed: there's no per-staff
// notification store, so this surfaces the same live queue the Bookings > Pending tab reads from
// (Notifications/ByBranch/{branchId}/pendingBookings), resolved against the full reservation and
// gated on isPaid so counts here always match what staff actually see in that tab.
export function usePendingBranchBookings() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [items, setItems] = useState<PendingBranchBooking[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    get(ref(db, `users/${uid}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setBranchId(data.branchId || data.branch || null);
        }
      })
      .catch((error) => {
        logError('usePendingBranchBookings.fetchBranch', error, { context: 'Error fetching admin branch' });
      });
  }, []);

  useEffect(() => {
    if (!branchId) return;

    const pendingRef = ref(db, `Notifications/ByBranch/${branchId}/pendingBookings`);
    const bookingUnsubscribes: Record<string, () => void> = {};
    const bookingData: Record<string, PendingBranchBooking> = {};

    const recompute = () => {
      const list = Object.values(bookingData).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setItems(list);
    };

    const unsubscribeIndex = onValue(pendingRef, (snapshot) => {
      const currentIds = new Set<string>();

      snapshot.forEach((snap) => {
        const entry = snap.val();
        if (!entry || !entry.userId || !entry.dateKey || !entry.appointmentId) return;
        const { userId, dateKey, appointmentId, createdAt } = entry;
        currentIds.add(appointmentId);

        if (bookingUnsubscribes[appointmentId]) return;

        const userBookingRef = ref(db, `Reservations/ReservationsByUser/${userId}/${dateKey}/${appointmentId}`);
        bookingUnsubscribes[appointmentId] = onValue(
          userBookingRef,
          (bookingSnap) => {
            const data = bookingSnap.val();
            if (!data || !data.isPaid) {
              delete bookingData[appointmentId];
              recompute();
              return;
            }
            bookingData[appointmentId] = {
              appointmentId,
              createdAt: createdAt || new Date().toISOString(),
              timeSlot: data.timeSlot || { appointmentDate: '', time: '' },
              vehicleDetails: data.vehicleDetails || { vehicleName: '', plateNumber: '', classification: '' },
              amountDue: data.amountDue || 0,
            };
            recompute();
          },
          (error) => {
            logError('usePendingBranchBookings.fetchBooking', error, { context: 'Error fetching pending booking' });
          }
        );
      });

      Object.keys(bookingUnsubscribes).forEach((id) => {
        if (!currentIds.has(id)) {
          bookingUnsubscribes[id]();
          delete bookingUnsubscribes[id];
          delete bookingData[id];
        }
      });
    });

    return () => {
      unsubscribeIndex();
      Object.values(bookingUnsubscribes).forEach((unsub) => unsub());
    };
  }, [branchId]);

  return { items, count: items.length };
}
