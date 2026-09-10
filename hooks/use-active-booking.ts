import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

export type BookingStatus = 'pending' | 'accepted' | 'ongoing';

export interface ActiveBooking {
  appointmentId: string;
  dateKey: string;
  branchName: string;
  time: string;
  status: BookingStatus;
}

// Higher priority wins when a customer has more than one active booking at once.
const STATUS_PRIORITY: Record<BookingStatus, number> = {
  ongoing: 2,
  accepted: 1,
  pending: 0,
};

// ActiveBookingBar floats via position: absolute and doesn't reserve its own space, so any
// scrollable screen that renders it needs to pad by this much (when a booking is active) to
// avoid rendering content behind it. Sized for the headline + illustration + stepper layout.
export const ACTIVE_BOOKING_BAR_HEIGHT = 144;

export function useActiveBooking(): { booking: ActiveBooking | null; loading: boolean } {
  const [booking, setBooking] = useState<ActiveBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const bookingsRef = ref(db, `Reservations/ReservationsByUser/${uid}`);

    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      let best: ActiveBooking | null = null;
      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          const status: BookingStatus | undefined =
            data?.status === 'pending' || data?.status === 'accepted' || data?.status === 'ongoing'
              ? data.status
              : undefined;
          if (!status) return;
          // An unpaid pending booking never reached the branch (booking fee abandoned). It's
          // "awaiting payment", not a live appointment - don't surface it as an active booking.
          if (status === 'pending' && data?.isPaid !== true) return;
          if (!best || STATUS_PRIORITY[status] > STATUS_PRIORITY[best.status]) {
            best = {
              appointmentId: bookingSnap.key || data.appointmentId,
              dateKey: dateSnap.key || '',
              branchName: data.branchName || '',
              time: data.timeSlot?.time || '',
              status,
            };
          }
        });
      });
      setBooking(best);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { booking, loading };
}
