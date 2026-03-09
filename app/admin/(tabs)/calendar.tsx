import { auth, db } from '@/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: '#F9EF08', text: '#7A6F00', label: 'Pending' },
  accepted:  { bg: '#34D399', text: '#fff',    label: 'Confirmed' },
  ongoing:   { bg: '#60A5FA', text: '#fff',    label: 'Ongoing' },
  completed: { bg: '#A3A3A3', text: '#fff',    label: 'Completed' },
  cancelled: { bg: '#F87171', text: '#fff',    label: 'Cancelled' },
};

const formatDatePath = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}-${d}-${y}`;
};

export default function AdminCalendarScreen() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, DayBooking[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  useEffect(() => {
    if (!branchId) return;
    const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
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
      setLoading(false);
    });
    return () => unsubscribe();
  }, [branchId]);

  const openModal = (date: Date) => {
    setSelectedDate(date);
    slideAnim.setValue(SCREEN_HEIGHT);
    setModalVisible(true);
    requestAnimationFrame(() => {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }).start();
    });
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCalendarMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  // Monday-first calendar weeks
  const getWeeks = (): (Date | null)[][] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay + 6) % 7; // Mon=0 … Sun=6

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
    !!selectedDate &&
    d.getFullYear() === selectedDate.getFullYear() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getDate() === selectedDate.getDate();

  const selectedBookings: DayBooking[] = selectedDate
    ? bookingsByDate[formatDatePath(selectedDate)] ?? []
    : [];

  const weeks = getWeeks();

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ── Month header ── */}
        <View className="flex-row items-center px-5 pt-3 pb-4">
          <Text className="text-[28px] font-bold text-[#1A1A1A] flex-1">
            {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => navigateMonth('prev')}
            className="w-9 h-9 rounded-full border border-[#E0E0E0] items-center justify-center mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigateMonth('next')}
            className="w-9 h-9 rounded-full border border-[#E0E0E0] items-center justify-center mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full border border-[#E0E0E0] items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={16} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week labels ── */}
        <View className="flex-row border-t border-b border-[#F0F0F0]">
          {DAY_LABELS.map((label, i) => (
            <View
              key={i}
              style={{ flex: 1 }}
              className={`items-center py-2${i < DAY_LABELS.length - 1 ? ' border-r border-[#F0F0F0]' : ''}`}
            >
              <Text className="text-[12px] font-semibold text-[#BDBDBD]">{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Calendar grid ── */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F9EF08" />
          </View>
        ) : (
          <View className="flex-1">
            {weeks.map((week, wi) => (
              <View
                key={wi}
                style={{ flex: 1, flexDirection: 'row' }}
                className={wi < weeks.length - 1 ? 'border-b border-[#F0F0F0]' : ''}
              >
                {week.map((date, di) => {
                  const isLastCol = di === 6;

                  if (!date) {
                    return (
                      <View
                        key={`e-${wi}-${di}`}
                        style={{ flex: 1 }}
                        className={!isLastCol ? 'border-r border-[#F0F0F0]' : ''}
                      />
                    );
                  }

                  const datePath = formatDatePath(date);
                  const dayBookings = bookingsByDate[datePath] ?? [];
                  const visible = dayBookings.slice(0, 2);
                  const overflow = dayBookings.length - 2;
                  const sel = isSelected(date);
                  const tod = isToday(date);
                  const currentMonth = date.getMonth() === calendarMonth.getMonth();

                  return (
                    <TouchableOpacity
                      key={datePath}
                      style={{ flex: 1, paddingHorizontal: 3, paddingTop: 5, paddingBottom: 3, overflow: 'hidden' }}
                      className={!isLastCol ? 'border-r border-[#F0F0F0]' : ''}
                      onPress={() => openModal(date)}
                      activeOpacity={0.6}
                    >
                      {/* Day number */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: sel ? '#F9EF08' : 'transparent',
                          marginBottom: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: sel || tod ? '700' : '500',
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

                      {/* Event pills */}
                      {visible.map((b, idx) => {
                        const s = STATUS_STYLE[b.status] ?? { bg: '#E0E0E0', text: '#666', label: b.status };
                        const label =
                          b.vehicleDetails?.vehicleName ||
                          b.vehicleDetails?.plateNumber ||
                          b.appointmentId;
                        return (
                          <View
                            key={idx}
                            style={{
                              backgroundColor: s.bg,
                              borderRadius: 4,
                              paddingHorizontal: 4,
                              paddingVertical: 2,
                              marginBottom: 2,
                            }}
                          >
                            <Text
                              style={{ color: s.text, fontSize: 10, fontWeight: '600' }}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })}

                      {overflow > 0 && (
                        <Text style={{ fontSize: 9, color: '#999', fontWeight: '500' }}>
                          +{overflow}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ── Bottom sheet modal ── */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="none"
          onRequestClose={closeModal}
        >
          <View style={{ flex: 1 }}>
            {/* Backdrop */}
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
              activeOpacity={1}
              onPress={closeModal}
            />

            {/* Sheet */}
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }],
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: SCREEN_HEIGHT * 0.72,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 24,
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' }} />
              </View>

              {/* Sheet header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: 20,
                  paddingTop: 8,
                  paddingBottom: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
                    {selectedDate?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#F5F5F5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={{ height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 20 }} />

              {/* Bookings list */}
              <ScrollView
                style={{ paddingHorizontal: 20, paddingTop: 12 }}
                contentContainerStyle={{ paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
              >
                {selectedBookings.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="calendar-outline" size={36} color="#E0E0E0" />
                    <Text style={{ fontSize: 13, color: '#BDBDBD', marginTop: 10 }}>
                      No bookings on this day
                    </Text>
                  </View>
                ) : (
                  selectedBookings.map((booking) => {
                    const s = STATUS_STYLE[booking.status] ?? { bg: '#E0E0E0', text: '#666', label: booking.status };
                    return (
                      <View
                        key={booking.appointmentId}
                        style={{
                          backgroundColor: '#FAFAFA',
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 10,
                        }}
                      >
                        {/* Vehicle name + status */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text
                            style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginRight: 8 }}
                            numberOfLines={1}
                          >
                            {booking.vehicleDetails?.vehicleName || 'Vehicle'}
                          </Text>
                          <View style={{ backgroundColor: s.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: s.text }}>
                              {s.label}
                            </Text>
                          </View>
                        </View>

                        {/* Plate · Type */}
                        <Text style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                          {booking.vehicleDetails?.plateNumber}
                          {booking.vehicleDetails?.plateNumber && booking.vehicleDetails?.classification ? '  ·  ' : ''}
                          {booking.vehicleDetails?.classification}
                        </Text>

                        {/* Time + Amount */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={13} color="#BDBDBD" />
                            <Text style={{ fontSize: 12, color: '#BDBDBD', marginLeft: 4 }}>
                              {booking.timeSlot?.time}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                            ₱{Number(booking.amountDue).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
