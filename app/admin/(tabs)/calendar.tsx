import DayAgenda from '@/components/ui/admin/calendar/DayAgenda';
import { auth, db } from '@/firebase/firebase';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { Ionicons } from '@expo/vector-icons';
import { endAt, get, onValue, orderByKey, query, ref, startAt } from 'firebase/database';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/common/AppButton';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const DAY_CELL_HEIGHT = 48;
const DATE_CIRCLE_SIZE = 36;
const CHARCOAL = '#1A1A1A';

// Booking-count thresholds for the density dots under each date. Tune here.
const DOT_DENSITY_THRESHOLDS = { oneDot: 1, twoDots: 4, threeDots: 8 };
const getDensityDotCount = (bookingCount: number): number => {
  if (bookingCount >= DOT_DENSITY_THRESHOLDS.threeDots) return 3;
  if (bookingCount >= DOT_DENSITY_THRESHOLDS.twoDots) return 2;
  if (bookingCount >= DOT_DENSITY_THRESHOLDS.oneDot) return 1;
  return 0;
};

const formatDatePath = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}-${d}-${y}`;
};

export default function AdminCalendarScreen() {
  const tabBarClearance = useTabBarClearance();
  const insets = useSafeAreaInsets();
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

  // Same setState calls navigateMonth/date-tap already use - just jumping straight to today
  // instead of stepping one month at a time.
  const goToToday = () => {
    const now = new Date();
    setCalendarMonth(now);
    setSelectedDate(now);
  };
  const isViewingCurrentMonth =
    calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() === today.getMonth();
  const showTodayShortcut = !isViewingCurrentMonth || !isSelected(today);

  const selectedBookings: DayBooking[] = bookingsByDate[formatDatePath(selectedDate)] ?? [];

  const weeks = getWeeks();

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="flex-1">
        <StatusBar style="dark" />

        {/* ── Month view (header, weekday labels, grid) - open layout, no grid lines, sits in
            its own white card above the gray day-agenda section below. Bleeds up behind the
            status bar itself (paddingTop: insets.top) rather than reserving that space with a
            top SafeAreaView, so the parent stays gray and the card's rounded bottom corners
            correctly reveal gray behind them instead of white-on-white. */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            paddingBottom: 12,
            paddingTop: insets.top,
          }}
        >
          {/* Month header */}
          <View className="flex-row items-center px-6 pt-3 pb-5">
            <Text className="text-[22px] font-bold text-[#1A1A1A] flex-1">
              {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </Text>
            {showTodayShortcut && (
              <AppButton
                onPress={goToToday}
                style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>Today</Text>
              </AppButton>
            )}
            <AppButton
              onPress={() => navigateMonth('prev')}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color="#1A1A1A" />
            </AppButton>
            <AppButton
              onPress={() => navigateMonth('next')}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color="#1A1A1A" />
            </AppButton>
          </View>

          {/* Day-of-week labels - horizontal padding matches the day agenda's content below, so
              the grid's columns line up with the cards on this now-continuous page. */}
          <View className="flex-row" style={{ paddingHorizontal: 20 }}>
            {DAY_LABELS.map((label, i) => (
              <View key={i} style={{ flex: 1 }} className="items-center">
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#9CA3AF' }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Month grid - renders immediately regardless of `loading`. The grid itself is pure
              calendar math with no data dependency; only the density dots below each day number
              depend on bookingsByDate, and now that the fetch is scoped to one month (see the
              effect above) they resolve fast enough not to need a blocking spinner. */}
          <View className="mt-2" style={{ paddingHorizontal: 20 }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ height: DAY_CELL_HEIGHT, flexDirection: 'row' }}>
                  {week.map((date, di) => {
                    if (!date) {
                      return <View key={`e-${wi}-${di}`} style={{ flex: 1 }} />;
                    }

                    const datePath = formatDatePath(date);
                    const dayBookings = bookingsByDate[datePath] ?? [];
                    const dotCount = getDensityDotCount(dayBookings.length);
                    const sel = isSelected(date);
                    const tod = isToday(date);
                    const isPastEmpty = !tod && date < today && dayBookings.length === 0;

                    return (
                      <AppButton
                        key={datePath}
                        style={{ flex: 1, minHeight: 44, alignItems: 'center', paddingTop: 4, gap: 4 }}
                        onPress={() => setSelectedDate(date)}
                      >
                        {/* Day number - transparent by default now that the whole grid sits on
                            its own white card; filled yellow when selected; a thin yellow ring
                            marks today when it isn't also selected. */}
                        <View
                          style={{
                            width: DATE_CIRCLE_SIZE,
                            height: DATE_CIRCLE_SIZE,
                            borderRadius: DATE_CIRCLE_SIZE / 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            backgroundColor: sel ? '#F9EF08' : 'transparent',
                            borderWidth: tod && !sel ? 1.75 : 0,
                            borderColor: tod && !sel ? '#F9EF08' : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: sel || tod ? '700' : '500',
                              color: isPastEmpty ? '#999999' : CHARCOAL,
                            }}
                          >
                            {date.getDate()}
                          </Text>
                        </View>

                        {/* Density dots - count-based (how many bookings), not status-based;
                            always yellow, including on the selected day. */}
                        <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
                          {Array.from({ length: dotCount }).map((_, i) => (
                            <View
                              key={i}
                              style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F9EF08' }}
                            />
                          ))}
                        </View>
                      </AppButton>
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
      </View>
    </View>
  );
}
