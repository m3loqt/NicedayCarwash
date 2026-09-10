import { auth, db } from '@/firebase/firebase';
import { logError } from '@/lib/logger';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { usePendingBranchBookings } from './use-pending-branch-bookings';

export interface BranchBookingCounts {
  pending: number;
  confirmed: number;
  ongoing: number;
}

// Live counts for the Bookings screen's tab badges. Pending reuses usePendingBranchBookings -
// the same isPaid-gated queue the notification bell already reads - rather than counting
// Reservations/ReservationsByBranch directly, since a still-pending booking doesn't exist there
// at all yet; only Confirmed/Ongoing do, once a booking has been accepted and copied over.
// History is deliberately left uncounted (see AppointmentsTabs.tsx) - unbounded and not
// actionable, unlike the other three.
export function useBranchBookingCounts(): BranchBookingCounts {
  const { count: pending } = usePendingBranchBookings();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(0);
  const [ongoing, setOngoing] = useState(0);

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
        logError('useBranchBookingCounts.fetchBranch', error, { context: 'Error fetching admin branch' });
      });
  }, []);

  useEffect(() => {
    if (!branchId) return;
    const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
    const unsubscribe = onValue(
      bookingsRef,
      (snapshot) => {
        let confirmedCount = 0;
        let ongoingCount = 0;
        snapshot.forEach((dateSnap) => {
          dateSnap.forEach((bookingSnap) => {
            const status = bookingSnap.val()?.status;
            if (status === 'accepted') confirmedCount++;
            else if (status === 'ongoing') ongoingCount++;
          });
        });
        setConfirmed(confirmedCount);
        setOngoing(ongoingCount);
      },
      (error) => {
        logError('useBranchBookingCounts.subscribe', error, { context: 'Failed to load branch bookings' });
      }
    );
    return () => unsubscribe();
  }, [branchId]);

  return { pending, confirmed, ongoing };
}
