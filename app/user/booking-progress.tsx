import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppointmentDetailsModal from '../../components/ui/user/history/modals/AppointmentDetailsModal';

type BookingStatus = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';

interface BookingData {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: BookingStatus;
  timeSlot: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
  paymentMethod: string;
  note?: string;
  services?: any[];
  addOns?: any[];
}

const STEPS: { id: BookingStatus | 'accepted'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'pending', label: 'Pending', icon: 'time-outline' },
  { id: 'accepted', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { id: 'ongoing', label: 'In Progress', icon: 'car-sport-outline' },
  { id: 'completed', label: 'Done', icon: 'sparkles-outline' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  ongoing: 2,
  completed: 3,
  cancelled: -1,
};

const STATUS_MESSAGE: Record<string, { title: string; subtitle: string }> = {
  pending: {
    title: 'Confirming your booking...',
    subtitle: "We're waiting for the branch to confirm your appointment.",
  },
  accepted: {
    title: 'Booking confirmed!',
    subtitle: 'Your appointment has been accepted. See you soon!',
  },
  ongoing: {
    title: 'Your car is being washed!',
    subtitle: 'Sit back and relax. We\'re taking care of your vehicle.',
  },
  completed: {
    title: 'Car wash complete!',
    subtitle: 'Your vehicle is clean and ready. Hope to see you again!',
  },
  cancelled: {
    title: 'Booking cancelled',
    subtitle: 'This appointment has been cancelled.',
  },
};

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

export default function BookingProgressScreen() {
  const { appointmentId, date } = useLocalSearchParams<{ appointmentId: string; date: string }>();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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

  const currentStepIndex = booking ? STATUS_ORDER[booking.status] ?? 0 : 0;
  const message = booking ? STATUS_MESSAGE[booking.status] : STATUS_MESSAGE.pending;
  const isPulsing = booking?.status === 'pending';

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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-[#1A1A1A] ml-2">Booking Status</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status Hero */}
        <View className="items-center pt-6 pb-8 px-6">
          {/* Animated icon */}
          <Animated.View
            style={{
              transform: [{ scale: isPulsing ? pulseAnim : 1 }],
              marginBottom: 20,
            }}
          >
            <View
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{
                backgroundColor:
                  booking.status === 'cancelled'
                    ? '#F5F5F5'
                    : booking.status === 'completed'
                    ? '#F9EF08'
                    : '#FFFDE7',
              }}
            >
              <Ionicons
                name={
                  booking.status === 'pending'
                    ? 'time-outline'
                    : booking.status === 'accepted'
                    ? 'checkmark-circle-outline'
                    : booking.status === 'ongoing'
                    ? 'car-sport-outline'
                    : booking.status === 'completed'
                    ? 'sparkles-outline'
                    : 'close-circle-outline'
                }
                size={36}
                color={
                  booking.status === 'cancelled'
                    ? '#BDBDBD'
                    : booking.status === 'completed'
                    ? '#1A1A00'
                    : '#F9A825'
                }
              />
            </View>
          </Animated.View>

          <Text className="text-[20px] font-bold text-[#1A1A1A] text-center mb-1">
            {message.title}
          </Text>
          <Text className="text-[13px] text-[#999] text-center leading-[19px]">
            {message.subtitle}
          </Text>
        </View>

        {/* Progress Steps */}
        {booking.status !== 'cancelled' && (
          <View className="mx-5 mb-6">
            <View className="flex-row items-center">
              {STEPS.map((step, index) => {
                const stepIndex = STATUS_ORDER[step.id] ?? index;
                const isCompleted = currentStepIndex > stepIndex;
                const isCurrent = currentStepIndex === stepIndex;
                const isFuture = currentStepIndex < stepIndex;

                return (
                  <View key={step.id} className="flex-1 items-center">
                    {/* Connector line before (skip first) */}
                    <View className="flex-row items-center w-full">
                      {index > 0 && (
                        <View
                          className="flex-1 h-[2px]"
                          style={{ backgroundColor: isCompleted || isCurrent ? '#F9EF08' : '#E5E5E5' }}
                        />
                      )}
                      {/* Circle */}
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: isCurrent
                            ? '#F9EF08'
                            : isCompleted
                            ? '#F9EF08'
                            : '#F5F5F5',
                        }}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={16} color="#1A1A00" />
                        ) : (
                          <Ionicons
                            name={step.icon}
                            size={16}
                            color={isCurrent ? '#1A1A00' : '#BDBDBD'}
                          />
                        )}
                      </View>
                      {/* Connector line after (skip last) */}
                      {index < STEPS.length - 1 && (
                        <View
                          className="flex-1 h-[2px]"
                          style={{
                            backgroundColor:
                              currentStepIndex > stepIndex ? '#F9EF08' : '#E5E5E5',
                          }}
                        />
                      )}
                    </View>
                    <Text
                      className="text-[10px] mt-1.5 text-center"
                      style={{
                        fontWeight: isCurrent ? '700' : '400',
                        color: isFuture ? '#BDBDBD' : '#1A1A1A',
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Booking Details Card */}
        <View className="mx-5 bg-[#FAFAFA] rounded-2xl overflow-hidden">
          {/* Branch */}
          <View className="px-4 py-4 flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-white border border-[#EEEEEE] items-center justify-center mr-3">
              <Ionicons name="location-outline" size={18} color="#9CA3AF" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-[#1A1A1A]">{booking.branchName}</Text>
              <Text className="text-[12px] text-[#999] mt-0.5" numberOfLines={1}>
                {booking.branchAddress || 'No address'}
              </Text>
            </View>
          </View>

          <View className="h-[0.5px] bg-[#EEEEEE] mx-4" />

          {/* Vehicle */}
          <View className="px-4 py-4 flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-white border border-[#EEEEEE] items-center justify-center mr-3">
              <Ionicons name="car-outline" size={18} color="#9CA3AF" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">
                {booking.vehicleDetails?.vehicleName}
              </Text>
              <Text className="text-[12px] text-[#999] mt-0.5">
                {booking.vehicleDetails?.plateNumber}  ·  {booking.vehicleDetails?.classification}
              </Text>
            </View>
          </View>

          <View className="h-[0.5px] bg-[#EEEEEE] mx-4" />

          {/* Date & Time */}
          <View className="px-4 py-4 flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-white border border-[#EEEEEE] items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">
                {formatDate(booking.timeSlot?.appointmentDate)}
              </Text>
              <Text className="text-[12px] text-[#999] mt-0.5">{booking.timeSlot?.time}</Text>
            </View>
          </View>

          <View className="h-[0.5px] bg-[#EEEEEE] mx-4" />

          {/* Amount */}
          <View className="px-4 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-white border border-[#EEEEEE] items-center justify-center mr-3">
                <Ionicons name="wallet-outline" size={18} color="#9CA3AF" />
              </View>
              <Text className="text-[13px] font-semibold text-[#1A1A1A]">Amount Due</Text>
            </View>
            <Text className="text-[15px] font-bold text-[#1A1A1A]">
              ₱{Number(booking.amountDue).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* View Full Details */}
        <View className="mx-5 mt-4">
          <TouchableOpacity
            className="bg-[#F9EF08] rounded-2xl py-4 items-center"
            onPress={() => setShowDetails(true)}
            activeOpacity={0.85}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">View Full Details</Text>
          </TouchableOpacity>
        </View>

        {/* Appointment ID */}
        <Text className="text-[11px] text-[#C4C4C4] text-center mt-4">
          {booking.appointmentId}
        </Text>
      </ScrollView>

      {/* Details Modal */}
      <AppointmentDetailsModal
        visible={showDetails}
        branchName={booking.branchName}
        branchAddress={booking.branchAddress}
        branchImage={require('../../assets/images/samplebranch.png')}
        vehicleName={booking.vehicleDetails?.vehicleName}
        plateNumber={booking.vehicleDetails?.plateNumber}
        classification={booking.vehicleDetails?.classification}
        date={booking.timeSlot?.appointmentDate}
        time={booking.timeSlot?.time}
        orderSummary={[
          ...(booking.services?.map((s: any) => ({ label: s?.name ?? 'Service', price: `₱${s?.price ?? 0}` })) ?? []),
          ...(booking.addOns?.map((a: any) => ({ label: a?.name ?? 'Add-on', price: `₱${a?.price ?? 0}` })) ?? []),
          { label: 'Booking Fee', price: '₱25' },
        ]}
        amountDue={String(booking.amountDue)}
        paymentMethod={booking.paymentMethod}
        estimatedCompletion={booking.timeSlot?.estCompletion}
        note={booking.note}
        status={booking.status}
        appointmentId={booking.appointmentId}
        onClose={() => setShowDetails(false)}
      />
    </SafeAreaView>
  );
}
