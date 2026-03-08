import { auth, db } from '@/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppointmentDetailsModal from '@/components/ui/user/history/modals/AppointmentDetailsModal';

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

const STATUS_COLORS: Record<string, string> = {
  pending: '#F9EF08',
  accepted: '#34D399',
  ongoing: '#60A5FA',
  completed: '#A3A3A3',
  cancelled: '#F87171',
};

const formatDatePath = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}-${d}-${y}`;
};

const parseDatePath = (path: string): Date | null => {
  const parts = path.split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
};

export default function AdminCalendarScreen() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, DayBooking[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<DayBooking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load branchId from user profile
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

  // Load bookings for branch
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
          grouped[dateKey].push({
            ...data,
            addOns,
            services,
            dateKey,
            key: bookingSnap.key || '',
          });
        });
      });
      setBookingsByDate(grouped);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [branchId]);

  // Animate day list in when a date is selected
  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    slideAnim.setValue(30);
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const navigateMonth = (dir: 'prev' | 'next') => {
    setSelectedDate(null);
    setCalendarMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  const getCalendarDays = (): (Date | null)[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isSelected = (date: Date) =>
    selectedDate !== null &&
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear();

  const selectedDateBookings: DayBooking[] = selectedDate
    ? bookingsByDate[formatDatePath(selectedDate)] ?? []
    : [];

  const calendarDays = getCalendarDays();

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-[#1A1A1A]">Calendar</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Month navigation */}
          <View className="flex-row items-center px-5 py-3">
            <Text className="text-[18px] font-bold text-[#1A1A1A] flex-1">
              {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => navigateMonth('prev')} className="p-2 mr-1">
              <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateMonth('next')} className="p-2">
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View className="flex-row px-4 mb-1">
            {DAY_LABELS.map((d, i) => (
              <View key={i} className="flex-1 items-center">
                <Text className="text-[11px] font-semibold text-[#BDBDBD]">{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#F9EF08" />
            </View>
          ) : (
            <View className="flex-row flex-wrap px-4">
              {calendarDays.map((date, idx) => {
                if (!date) return <View key={`empty-${idx}`} className="w-[14.28%] aspect-square" />;
                const datePath = formatDatePath(date);
                const dayBookings = bookingsByDate[datePath] ?? [];
                const hasBookings = dayBookings.length > 0;
                const sel = isSelected(date);
                const tod = isToday(date);

                return (
                  <TouchableOpacity
                    key={datePath}
                    className="w-[14.28%] aspect-square items-center justify-center"
                    onPress={() => handleDayPress(date)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        sel ? 'bg-[#F9EF08]' : tod ? 'bg-[#FFFDE7]' : ''
                      }`}
                    >
                      <Text
                        className={`text-[14px] ${
                          sel
                            ? 'font-bold text-[#1A1A00]'
                            : tod
                            ? 'font-bold text-[#F9A825]'
                            : 'font-medium text-[#1A1A1A]'
                        }`}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                    {/* Booking dots */}
                    {hasBookings && (
                      <View className="flex-row mt-0.5 gap-0.5">
                        {dayBookings.slice(0, 3).map((b, i) => (
                          <View
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: STATUS_COLORS[b.status] ?? '#BDBDBD',
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View className="flex-row flex-wrap px-5 mt-4 gap-x-4 gap-y-2">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <View key={status} className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
                <Text className="text-[11px] text-[#999] capitalize">{status}</Text>
              </View>
            ))}
          </View>

          {/* Selected day bookings */}
          {selectedDate && (
            <Animated.View
              className="mx-5 mt-5"
              style={{ transform: [{ translateY: slideAnim }] }}
            >
              <View className="flex-row items-center mb-3">
                <Text className="text-[16px] font-bold text-[#1A1A1A] flex-1">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <View className="bg-[#F5F5F5] rounded-full px-2.5 py-1">
                  <Text className="text-[12px] font-semibold text-[#666]">
                    {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {selectedDateBookings.length === 0 ? (
                <View className="bg-[#FAFAFA] rounded-2xl py-10 items-center">
                  <Ionicons name="calendar-outline" size={32} color="#E0E0E0" />
                  <Text className="text-[13px] text-[#999] mt-3">No bookings on this day</Text>
                </View>
              ) : (
                selectedDateBookings.map((booking) => (
                  <TouchableOpacity
                    key={booking.appointmentId}
                    className="bg-[#FAFAFA] rounded-2xl px-4 py-4 mb-2"
                    onPress={() => { setSelectedBooking(booking); setShowDetails(true); }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-[14px] font-bold text-[#1A1A1A] flex-1 mr-2" numberOfLines={1}>
                        {booking.vehicleDetails?.vehicleName || 'Vehicle'}
                      </Text>
                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{ backgroundColor: `${STATUS_COLORS[booking.status]}20` }}
                      >
                        <Text
                          className="text-[11px] font-semibold capitalize"
                          style={{ color: STATUS_COLORS[booking.status] }}
                        >
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[12px] text-[#999]">
                      {booking.vehicleDetails?.plateNumber}  ·  {booking.vehicleDetails?.classification}
                    </Text>
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={13} color="#BDBDBD" />
                        <Text className="text-[12px] text-[#BDBDBD] ml-1">{booking.timeSlot?.time}</Text>
                      </View>
                      <Text className="text-[13px] font-bold text-[#1A1A1A]">
                        ₱{Number(booking.amountDue).toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </Animated.View>
          )}
        </ScrollView>

        {selectedBooking && (
          <AppointmentDetailsModal
            visible={showDetails}
            branchName={selectedBooking.branchName}
            branchAddress={selectedBooking.branchAddress}
            branchImage={require('../../../assets/images/samplebranch.png')}
            vehicleName={selectedBooking.vehicleDetails?.vehicleName}
            plateNumber={selectedBooking.vehicleDetails?.plateNumber}
            classification={selectedBooking.vehicleDetails?.classification}
            date={selectedBooking.timeSlot?.appointmentDate}
            time={selectedBooking.timeSlot?.time}
            orderSummary={[
              ...(selectedBooking.services?.map((s: any) => ({ label: s?.name ?? 'Service', price: `₱${s?.price ?? 0}` })) ?? []),
              ...(selectedBooking.addOns?.map((a: any) => ({ label: a?.name ?? 'Add-on', price: `₱${a?.price ?? 0}` })) ?? []),
              { label: 'Booking Fee', price: '₱25' },
            ]}
            amountDue={String(selectedBooking.amountDue)}
            paymentMethod={selectedBooking.paymentMethod}
            estimatedCompletion={selectedBooking.timeSlot?.estCompletion}
            note={selectedBooking.note}
            status={selectedBooking.status}
            appointmentId={selectedBooking.appointmentId}
            isAdminView
            onClose={() => { setShowDetails(false); setSelectedBooking(null); }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
