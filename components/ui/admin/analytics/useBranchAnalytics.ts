import { db } from '@/firebase/firebase';
import { logError } from '@/lib/logger';
import { onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';

type Status = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';

interface RawBooking {
  appointmentId: string;
  status: Status;
  amountDue: number;
  timeSlot: { time: string; appointmentDate: string };
  completedAt?: string;
  createdAt?: string;
  vehicleName?: string;
  plateNumber?: string;
}

export interface PeriodBucket {
  revenue: number;
  bookingsCount: number;
  completedCount: number;
  cancelledCount: number;
}

export interface RecentBooking {
  appointmentId: string;
  vehicleName: string;
  plateNumber: string;
  time: string;
  status: Status;
  amountDue: number;
}

export interface BranchAnalytics {
  loading: boolean;
  /** Last 14 calendar days, oldest -> newest. */
  dailyBuckets: PeriodBucket[];
  /** Last 7 rolling 7-day windows, oldest -> newest. */
  weeklyBuckets: PeriodBucket[];
  /** Last 6 calendar months, oldest -> newest. */
  monthlyBuckets: PeriodBucket[];
  /** Newest first, capped - for the "Recent bookings" list. */
  recentBookings: RecentBooking[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_DAY_AGG = { revenue: 0, bookingsCount: 0, completedCount: 0, cancelledCount: 0 };

// Resolves the calendar day a booking counts against: the actual completion
// timestamp when we have it, otherwise the originally scheduled appointment date.
const resolveBookingDate = (booking: RawBooking): Date | null => {
  if (booking.completedAt) {
    const d = new Date(booking.completedAt);
    if (!isNaN(d.getTime())) return d;
  }
  const [month, day, year] = (booking.timeSlot?.appointmentDate || '').split('-').map(Number);
  if (!month || !day || !year) return null;
  return new Date(year, month - 1, day);
};

const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function useBranchAnalytics(branchId: string | null): BranchAnalytics {
  const [bookings, setBookings] = useState<RawBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
    const unsubscribe = onValue(
      bookingsRef,
      (snapshot) => {
        const list: RawBooking[] = [];
        snapshot.forEach((dateSnap) => {
          dateSnap.forEach((bookingSnap) => {
            const data = bookingSnap.val();
            if (!data) return;
            list.push({
              appointmentId: data.appointmentId || bookingSnap.key || '',
              status: data.status || 'pending',
              amountDue: Number(data.amountDue) || 0,
              timeSlot: data.timeSlot || { time: '', appointmentDate: '' },
              completedAt: data.completedAt,
              createdAt: data.createdAt,
              vehicleName: data.vehicleDetails?.vehicleName || '',
              plateNumber: data.vehicleDetails?.plateNumber || '',
            });
          });
        });
        setBookings(list);
        setLoading(false);
      },
      (error) => {
        logError('useBranchAnalytics.subscribe', error, { context: 'Failed to load branch bookings' });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [branchId]);

  return useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // Wide enough to cover the daily (14d), weekly (7x7d), and monthly (6mo) buckets below.
    const lookbackStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // --- Per-day aggregates: the shared building block every bucket size below sums over, so
    // revenue/bookings/completion-rate all stay consistent with each other and with the
    // Daily/Weekly/Monthly filter, instead of each metric having its own hardcoded window. ---
    const dayAggMap: Record<string, typeof EMPTY_DAY_AGG> = {};
    for (const b of bookings) {
      const d = resolveBookingDate(b);
      if (!d || d.getTime() < lookbackStart.getTime() || d.getTime() >= todayEnd.getTime()) continue;

      const key = toDateKey(d);
      const agg = dayAggMap[key] ?? { ...EMPTY_DAY_AGG };
      agg.bookingsCount += 1;
      if (b.status === 'completed') {
        agg.completedCount += 1;
        agg.revenue += b.amountDue;
      } else if (b.status === 'cancelled') {
        agg.cancelledCount += 1;
      }
      dayAggMap[key] = agg;
    }

    const dayAgg = (d: Date) => dayAggMap[toDateKey(d)] ?? EMPTY_DAY_AGG;
    const sumDays = (days: Date[]): PeriodBucket =>
      days.reduce<PeriodBucket>(
        (sum, d) => {
          const agg = dayAgg(d);
          return {
            revenue: sum.revenue + agg.revenue,
            bookingsCount: sum.bookingsCount + agg.bookingsCount,
            completedCount: sum.completedCount + agg.completedCount,
            cancelledCount: sum.cancelledCount + agg.cancelledCount,
          };
        },
        { revenue: 0, bookingsCount: 0, completedCount: 0, cancelledCount: 0 }
      );

    // --- Daily buckets (last 14 days, oldest -> newest) ---
    const dailyBuckets: PeriodBucket[] = [];
    for (let i = 13; i >= 0; i--) {
      dailyBuckets.push(sumDays([new Date(todayEnd.getTime() - (i + 1) * DAY_MS)]));
    }

    // --- Weekly buckets (last 7 rolling 7-day windows, oldest -> newest) ---
    const weeklyBuckets: PeriodBucket[] = [];
    for (let w = 6; w >= 0; w--) {
      const weekEnd = new Date(todayEnd.getTime() - w * 7 * DAY_MS);
      const weekStart = new Date(weekEnd.getTime() - 7 * DAY_MS);
      const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
      weeklyBuckets.push(sumDays(days));
    }

    // --- Monthly buckets (last 6 calendar months, oldest -> newest) ---
    const monthlyBuckets: PeriodBucket[] = [];
    for (let m = 5; m >= 0; m--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const days: Date[] = [];
      for (let d = monthStart; d < monthEnd; d = new Date(d.getTime() + DAY_MS)) {
        days.push(d);
      }
      monthlyBuckets.push(sumDays(days));
    }

    // --- Recent bookings (newest first) - "recency" is the completion time if finished,
    // otherwise when the booking was created, so an active wash still surfaces near the top. ---
    const recencyOf = (b: RawBooking): number => {
      const t = b.completedAt || b.createdAt;
      const parsed = t ? new Date(t).getTime() : NaN;
      if (!isNaN(parsed)) return parsed;
      const d = resolveBookingDate(b);
      return d ? d.getTime() : 0;
    };
    const recentBookings: RecentBooking[] = [...bookings]
      .sort((a, b) => recencyOf(b) - recencyOf(a))
      .slice(0, 6)
      .map((b) => ({
        appointmentId: b.appointmentId,
        vehicleName: b.vehicleName || 'Vehicle',
        plateNumber: b.plateNumber || '',
        time: b.timeSlot?.time || '',
        status: b.status,
        amountDue: b.amountDue,
      }));

    return {
      loading,
      dailyBuckets,
      weeklyBuckets,
      monthlyBuckets,
      recentBookings,
    };
  }, [bookings, loading]);
}
