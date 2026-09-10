import DayAgenda, { STATUS_STYLE } from '@/components/ui/admin/calendar/DayAgenda';
import { auth, db } from '@/firebase/firebase';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { Ionicons } from '@expo/vector-icons';
import { endAt, get, onValue, orderByKey, query, ref, startAt } from 'firebase/database';
import { useEffect, useState } from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DayBooking {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: string;
  timeSlot: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
  paymentMethod: string;
  note?: string;
  services?: any[];
  addOns?: any[];
  dateKey: string;
  key: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_CELL_HEIGHT = 70;

// Stable order so a day's dots don't jitter position as bookings load in different order.
const STATUS_ORDER = ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'];

const formatDatePath = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}-${d}-${y}`;
};

export default function AdminCalendarScreen() {
  const tabBarClearance = useTabBarClearance();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, DayBooking[]>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Bumped by pull-to-refresh (in DayAgenda) to force the query effect below to unsubscribe/
  // resubscribe, which delivers a fresh snapshot immediately without disturbing calendarMonth
  // or selectedDate.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    get(ref(db, `users/${user.uid}`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setBranchId(data.branchId ?? data.branch ?? null);
      }
    });
  }, []);

  // Scoped to the currently-viewed month only (dateKey is a zero-padded MM-DD-YYYY string, so a
  // key range within one fixed month/year sorts correctly) - the calendar only ever shows one
  // month at a time, but the old unscoped `ref(...ReservationsByBranch/{branchId})` subscribed
  // to the branch's ENTIRE booking history, downloading and re-parsing years of data (and
  // re-running that parse on every single new booking anywhere in the tree) just to render one
  // grid of day numbers. That's what made this screen slow to load.
  useEffect(() => {
    if (!branchId) return;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const mm = String(month + 1).padStart(2, '0');
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStartKey = `${mm}-01-${year}`;
    const monthEndKey = `${mm}-${String(daysInMonth).padStart(2, '0')}-${year}`;

    const bookingsQuery = query(
      ref(db, `Reservations/ReservationsByBranch/${branchId}`),
      orderByKey(),
      startAt(monthStartKey),
      endAt(monthEndKey)
    );
    const unsubscribe = onValue(bookingsQuery, (snapshot) => {
      const grouped: Record<string, DayBooking[]> = {};
      snapshot.forEach((dateSnap) => {
        const dateKey = dateSnap.key || '';
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (!data) return;
          const addOns = Array.isArray(data.addOns)
            ? data.addOns
            : data.addOns && typeof data.addOns === 'object'
            ? Object.values(data.addOns)
            : [];
          const services = Array.isArray(data.services)
            ? data.services
            : data.services && typeof data.services === 'object'
            ? Object.values(data.services)
            : [];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push({ ...data, addOns, services, dateKey, key: bookingSnap.key || '' });
        });
      });
      setBookingsByDate(grouped);
    });
    return () => unsubscribe();
  }, [branchId, calendarMonth, refreshKey]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCalendarMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
    // Keeps the agenda below in sync with a month the grid now only ever fetches one of at a
    // time - without this, the selected day could point at a date whose data no longer loads.
    setSelectedDate((prev) => {
      const target = new Date(prev);
      target.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      // Clamp for month-length mismatches (e.g. Jan 31 -> Feb 31 would otherwise roll into March).
      if (target.getDate() !== prev.getDate()) target.setDate(0);
      return target;
    });
  };

  // Sunday-first calendar weeks
  const getWeeks = (): (Date | null)[][] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay;

    const days: (Date | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    // Ensure minimum 5 rows
    while (weeks.length < 5) weeks.push(Array(7).fill(null));
    return weeks;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const isSelected = (d: Date) =>
    d.getFullYear() === selectedDate.getFullYear() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getDate() === selectedDate.getDate();

  const selectedBookings: DayBooking[] = bookingsByDate[formatDatePath(selectedDate)] ?? [];

  const weeks = getWeeks();

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ── Month view (header, weekday labels, grid) ── */}
        <View className="bg-white">
          {/* Month header */}
          <View className="flex-row items-center px-6 pt-3 pb-5">
            <Text className="text-[28px] font-bold text-[#1A1A1A] flex-1">
              {MONTHS[calendarMonth.getMonth()]}
            </Text>
            <TouchableOpacity
              onPress={() => navigateMonth('prev')}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-back" size={18} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateMonth('next')}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-forward" size={18} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View className="flex-row px-0">
            {DAY_LABELS.map((label, i) => (
              <View key={i} style={{ flex: 1 }} className="items-center">
                <Text className="text-[13px] text-[#BDBDBD]">{label}</Text>
              </View>
            ))}
          </View>

          {/* Month grid - renders immediately regardless of `loading`. The grid itself is pure
              calendar math with no data dependency; only the status dots below each day number
              depend on bookingsByDate, and now that the fetch is scoped to one month (see the
              effect above) they resolve fast enough not to need a blocking spinner. */}
          <View className="mx-0 mt-2 border border-[#EEEEEE] overflow-hidden">
              {weeks.map((week, wi) => (
                <View
                  key={wi}
                  style={{
                    height: DAY_CELL_HEIGHT,
                    flexDirection: 'row',
                    borderBottomWidth: wi < weeks.length - 1 ? 1 : 0,
                    borderColor: '#EEEEEE',
                  }}
                >
                  {week.map((date, di) => {
                    const cellBorder = { borderRightWidth: di < 6 ? 1 : 0, borderColor: '#EEEEEE' };
                    if (!date) {
                      return <View key={`e-${wi}-${di}`} style={{ flex: 1, ...cellBorder }} />;
                    }

                    const datePath = formatDatePath(date);
                    const dayBookings = bookingsByDate[datePath] ?? [];
                    const statusesPresent = STATUS_ORDER.filter((s) => dayBookings.some((b) => b.status === s)).slice(0, 3);
                    const sel = isSelected(date);
                    const tod = isToday(date);
                    const currentMonth = date.getMonth() === calendarMonth.getMonth();

                    return (
                      <TouchableOpacity
                        key={datePath}
                        style={{ flex: 1, alignItems: 'center', paddingTop: 4, gap: 4, ...cellBorder }}
                        onPress={() => setSelectedDate(date)}
                        activeOpacity={0.6}
                      >
                        {/* Day number */}
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            aspectRatio: 1,
                            borderRadius: 999,
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            overflow: 'hidden',
                            backgroundColor: sel ? '#F9EF08' : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: sel ? '700' : '500',
                              color: sel
                                ? '#1A1A00'
                                : tod
                                ? '#F9A825'
                                : currentMonth
                                ? '#1A1A1A'
                                : '#D0D0D0',
                            }}
                          >
                            {date.getDate()}
                          </Text>
                        </View>

                        {/* Status dots */}
                        <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
                          {statusesPresent.map((status) => (
                            <View
                              key={status}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 2.5,
                                backgroundColor: STATUS_STYLE[status]?.bg ?? '#E0E0E0',
                              }}
                            />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
          </View>
        </View>

        {/* ── Selected day agenda ── */}
        <View className="flex-1 bg-[#FAFAFA]" style={{ paddingBottom: tabBarClearance }}>
          <DayAgenda
            date={selectedDate}
            isToday={isToday(selectedDate)}
            bookings={selectedBookings}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
