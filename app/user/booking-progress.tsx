import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BookingStatus = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';

interface BookingData {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: BookingStatus;
  createdAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  timeSlot: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
  paymentMethod: string;
  note?: string;
  services?: any[];
  addOns?: any[];
}

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  ongoing: 2,
  completed: 3,
  cancelled: -1,
};

// "ongoing" fires automatically once the scheduled time arrives (see autoStartTodayBookings in
// AppointmentsList.tsx) - it isn't a supervisor confirming the vehicle physically showed up, so
// the label here has to stop short of claiming the wash itself is happening.
const STEPS: { id: BookingStatus; label: string; timestampKey: keyof BookingData }[] = [
  { id: 'pending', label: 'Booking Confirmed', timestampKey: 'createdAt' },
  { id: 'accepted', label: 'Accepted by Branch', timestampKey: 'acceptedAt' },
  { id: 'ongoing', label: 'Appointment Time Started', timestampKey: 'startedAt' },
  { id: 'completed', label: 'Completed', timestampKey: 'completedAt' },
];

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
};

const formatDateTime = (isoLike?: string): string => {
  if (!isoLike) return '';
  const d = new Date(isoLike);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${hours}:${minutes} ${ampm}`;
};

const parseAppointmentDateTime = (appointmentDate: string, time: string): Date => {
  const [month, day, year] = (appointmentDate || '').split('-').map(Number);
  const match = (time || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hours = 0;
  let minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  return new Date(year || 1970, (month || 1) - 1, day || 1, hours, minutes);
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-start py-2">
      <Text className="text-[13px] text-[#999] mr-3">{label}</Text>
      <Text className="text-[13px] font-semibold text-[#1A1A1A] flex-1 text-right">{value}</Text>
    </View>
  );
}

export default function BookingProgressScreen() {
  const { appointmentId, date } = useLocalSearchParams<{ appointmentId: string; date: string }>();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId || !date) return;
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const db = getDatabase();
    const bookingRef = ref(db, `Reservations/ReservationsByUser/${userId}/${date}/${appointmentId}`);

    const unsubscribe = onValue(bookingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const addOnsObj = data.addOns;
        const addOns = Array.isArray(addOnsObj)
          ? addOnsObj
          : addOnsObj && typeof addOnsObj === 'object'
          ? Object.values(addOnsObj)
          : [];
        const servicesObj = data.services;
        const services = Array.isArray(servicesObj)
          ? servicesObj
          : servicesObj && typeof servicesObj === 'object'
          ? Object.values(servicesObj)
          : [];
        setBooking({ ...data, addOns, services });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appointmentId, date]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#F9EF08" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8" edges={['top']}>
        <Ionicons name="alert-circle-outline" size={48} color="#E0E0E0" />
        <Text className="text-base text-[#999] mt-4 text-center">Booking not found</Text>
        <TouchableOpacity
          className="mt-6 bg-[#F9EF08] rounded-2xl px-8 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-[14px] font-bold text-[#1A1A00]">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentStepIndex = STATUS_ORDER[booking.status] ?? 0;

  // Only estimated for the one step that hasn't happened yet - matches how far we can honestly
  // predict (branch acceptance timing isn't something we model, so no estimate for that step).
  const estMinutes = parseFloat(String(booking.timeSlot?.estCompletion || '0').replace(/[^\d.]/g, '')) || 0;
  const expectedCompletion = booking.startedAt
    ? new Date(new Date(booking.startedAt).getTime() + estMinutes * 60000)
    : new Date(parseAppointmentDateTime(booking.timeSlot?.appointmentDate, booking.timeSlot?.time).getTime() + estMinutes * 60000);

  const orderRows = [
    ...(booking.services?.map((s: any) => ({ label: s?.name ?? 'Service', price: s?.price ?? 0 })) ?? []),
    ...(booking.addOns?.map((a: any) => ({ label: a?.name ?? 'Add-on', price: a?.price ?? 0 })) ?? []),
    { label: 'Booking Fee', price: 25 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-5">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-9 h-9 rounded-full border border-[#EEEEEE] items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[17px] font-bold text-[#1A1A1A] mr-9">
          Booking Status
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6">
          <Text className="text-[16px] font-bold text-[#1A1A1A] mb-3">
            Appointment #{booking.appointmentId}
          </Text>

          {/* Client-confirmed notice copy - sets expectations that acceptance only happens
              during the branch's operating hours, not the moment a booking is placed. */}
          {booking.status === 'pending' && (
            <View className="flex-row items-start bg-[#FFFBE0] rounded-xl px-4 py-3 mb-6">
              <Ionicons name="information-circle-outline" size={16} color="#8A7A00" style={{ marginRight: 8, marginTop: 1 }} />
              <Text className="flex-1 text-[12px] text-[#5A5100] leading-[17px]">
                Booking hours can only be accepted during the operating hours of this branch, please be patient.
              </Text>
            </View>
          )}

          {booking.status === 'cancelled' ? (
            <View className="items-center py-10">
              <Ionicons name="close-circle-outline" size={40} color="#BDBDBD" />
              <Text className="text-[16px] font-bold text-[#1A1A1A] mt-3">Booking Cancelled</Text>
              <Text className="text-[13px] text-[#999] mt-1 text-center">
                This appointment has been cancelled.
              </Text>
            </View>
          ) : (
            /* Vertical timeline */
            <View>
              {STEPS.map((step, index) => {
                const stepIndex = STATUS_ORDER[step.id];
                const reached = currentStepIndex >= stepIndex;
                const isLast = index === STEPS.length - 1;
                const timestamp = booking[step.timestampKey] as string | undefined;

                let subtitle = '';
                if (reached && timestamp) {
                  subtitle = formatDateTime(timestamp);
                } else if (!reached && step.id === 'completed') {
                  subtitle = `Expected ${formatDateTime(expectedCompletion.toISOString())}`;
                }

                return (
                  <View key={step.id} className="flex-row">
                    {/* Circle + connecting line */}
                    <View className="items-center mr-4" style={{ width: 28 }}>
                      <View
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{ backgroundColor: reached ? '#F9EF08' : '#EFEFEF' }}
                      >
                        <Ionicons name="checkmark" size={14} color={reached ? '#1A1A1A' : '#BDBDBD'} />
                      </View>
                      {!isLast && (
                        <View
                          style={{
                            width: 2,
                            flex: 1,
                            minHeight: 56,
                            backgroundColor: currentStepIndex > stepIndex ? '#F9EF08' : '#EFEFEF',
                          }}
                        />
                      )}
                    </View>

                    {/* Label + timestamp */}
                    <View className="flex-1 pb-10">
                      <Text
                        className="text-[14.5px] font-bold"
                        style={{ color: reached ? '#1A1A1A' : '#BDBDBD' }}
                      >
                        {step.label}
                      </Text>
                      {!!subtitle && (
                        <Text className="text-[12px] text-[#999] mt-0.5">{subtitle}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View className="h-[0.5px] bg-[#EEEEEE] my-2" />

          {/* Branch / vehicle / date summary */}
          <Row label="Branch" value={booking.branchName} />
          <Row
            label="Vehicle"
            value={`${booking.vehicleDetails?.vehicleName || ''} · ${booking.vehicleDetails?.plateNumber || ''}${
              booking.vehicleDetails?.classification ? ` · ${booking.vehicleDetails.classification}` : ''
            }`}
          />
          <Row
            label="Date & Time"
            value={`${formatDate(booking.timeSlot?.appointmentDate)} · ${booking.timeSlot?.time || ''}`}
          />

          <View className="h-[0.5px] bg-[#EEEEEE] my-3" />

          {/* Order details */}
          <Text className="text-[15px] font-bold text-[#1A1A1A] mb-1">Order Details</Text>
          {orderRows.map((item, idx) => (
            <Row key={idx} label={item.label} value={`₱${Number(item.price).toFixed(2)}`} />
          ))}
          <View className="h-[0.5px] bg-[#EEEEEE] my-2" />
          <Row label="Total" value={`₱${Number(booking.amountDue).toFixed(2)}`} />

          <View className="h-[0.5px] bg-[#EEEEEE] my-3" />

          {/* Everything this used to hide behind a separate "View Full Details" modal - which,
              on this exact screen, had its own "View Booking Status" button that just looped
              back here. Shown inline instead so there's nowhere left to loop to. */}
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-[13px] text-[#999]">Payment Method</Text>
            {booking.paymentMethod?.toLowerCase() === 'maya' ? (
              <Image
                source={require('../../assets/images/maya_logo.png')}
                style={{ width: 51, height: 16 }}
                resizeMode="contain"
              />
            ) : (
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">
                {booking.paymentMethod || 'Not selected'}
              </Text>
            )}
          </View>

          <Text className="text-[15px] font-bold text-[#1A1A1A] mt-3 mb-2">Note</Text>
          <View className="rounded-xl bg-[#FAFAFA] p-3">
            <Text className="text-[12px] text-[#666] leading-[17px]">
              {booking.note || 'No note provided.'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="px-6 mt-6">
          {/* Only while a branch hasn't acted on it yet - once accepted, the branch is locked in */}
          {booking.status === 'pending' && (
            <TouchableOpacity
              className="bg-white border border-[#EEEEEE] rounded-full py-4 items-center flex-row justify-center mt-3"
              onPress={() =>
                router.push({
                  pathname: '/user/switch-branch' as any,
                  params: { appointmentId: booking.appointmentId, date: booking.timeSlot?.appointmentDate },
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color="#1A1A1A" style={{ marginRight: 6 }} />
              <Text className="text-[14px] font-bold text-[#1A1A1A]">Look for Another Branch</Text>
            </TouchableOpacity>
          )}

          {booking.status === 'completed' && (
            <TouchableOpacity
              className="bg-white border border-[#EEEEEE] rounded-full py-4 items-center flex-row justify-center mt-3"
              onPress={() =>
                router.push({
                  pathname: '/user/e-receipt' as any,
                  params: { appointmentId: booking.appointmentId, date: booking.timeSlot?.appointmentDate },
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons name="receipt-outline" size={16} color="#1A1A1A" style={{ marginRight: 6 }} />
              <Text className="text-[14px] font-bold text-[#1A1A1A]">View E-Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
