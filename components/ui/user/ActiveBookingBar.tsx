import { ActiveBookingSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import { useActiveBooking, type BookingStatus } from '@/hooks/use-active-booking';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, Text, TouchableOpacity, View } from 'react-native';

const STATUS_ART: Record<BookingStatus, any> = {
  pending: require('../../../assets/images/booking_status_pending.png'),
  accepted: require('../../../assets/images/booking_status_confirmed.png'),
  ongoing: require('../../../assets/images/booking_status_ongoing.png'),
};

// "ongoing" now means the scheduled time has arrived (a fully automatic, time-driven trigger -
// see autoStartTodayBookings in AppointmentsList.tsx), not that a supervisor has confirmed the
// vehicle physically showed up. Copy here has to stay honest about that - it used to claim
// "Wash in Progress" the instant the clock hit the appointment time, which could tell a customer
// running late that their car was already being washed.
const HEADLINE: Record<BookingStatus, string> = {
  pending: 'Awaiting Confirmation',
  accepted: 'Booking Confirmed',
  ongoing: 'Appointment Time Started',
};

// The 4 stages of a booking's life, mirroring the "Ready" illustration reserved for a future
// completion moment - completed bookings drop out of useActiveBooking entirely, so this bar
// itself never shows the 4th stage as "current," only as the stepper's unreached end state.
const STAGES: { status: BookingStatus | 'completed'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'pending', label: 'Booked', icon: 'document-text-outline' },
  { status: 'accepted', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { status: 'ongoing', label: 'Started', icon: 'water-outline' },
  { status: 'completed', label: 'Ready', icon: 'home-outline' },
];

const STAGE_INDEX: Record<BookingStatus, number> = { pending: 0, accepted: 1, ongoing: 2 };

export default function ActiveBookingBar() {
  const { hidden } = useTabBarVisibility();
  const tabBarClearance = useTabBarClearance(12);
  const { booking, loading } = useActiveBooking();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (!booking) return;
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [booking?.appointmentId, slideAnim]);

  useEffect(() => {
    if (booking?.status !== 'ongoing') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [booking?.status, pulseAnim]);

  if (hidden) return null;

  if (loading) {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: tabBarClearance,
          paddingHorizontal: 16,
          pointerEvents: 'box-none',
        }}
      >
        <ActiveBookingSkeleton />
      </View>
    );
  }

  if (!booking) return null;

  const currentIndex = STAGE_INDEX[booking.status];

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: tabBarClearance,
        paddingHorizontal: 16,
        pointerEvents: 'box-none',
      }}
    >
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/user/booking-progress',
            params: { appointmentId: booking.appointmentId, date: booking.dateKey },
          } as any)
        }
        activeOpacity={0.92}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View className="bg-white rounded-2xl px-4 pt-4 pb-3.5 border border-[#F0F0F0]">
          {/* Headline + branch, with the current stage's illustration on the right */}
          <View className="flex-row items-center">
            <View className="flex-1 mr-3">
              <Text className="text-[19px] font-bold text-[#1A1A1A]" numberOfLines={1}>
                {HEADLINE[booking.status]}
              </Text>
              <Text className="text-[12px] text-[#999] mt-1" numberOfLines={1}>
                {booking.time ? `Booked for ${booking.time} at ${booking.branchName}` : `Booked at ${booking.branchName}`}
              </Text>
            </View>
            <Image source={STATUS_ART[booking.status]} style={{ width: 68, height: 68 }} resizeMode="contain" />
          </View>

          {/* Stepper - filled up to the current stage, current icon pulses while ongoing */}
          <View className="flex-row items-center mt-3.5">
            {STAGES.map((stage, i) => {
              const reached = i <= currentIndex;
              const isCurrent = i === currentIndex;
              const isLast = i === STAGES.length - 1;
              const icon = (
                <Ionicons name={stage.icon} size={16} color={reached ? '#F9EF08' : '#D4D4D4'} />
              );
              return (
                <View key={stage.status} style={{ flexDirection: 'row', alignItems: 'center', flex: isLast ? 0 : 1 }}>
                  {isCurrent && booking.status === 'ongoing' ? (
                    <Animated.View style={{ opacity: pulseAnim }}>{icon}</Animated.View>
                  ) : (
                    icon
                  )}
                  {!isLast && (
                    <View
                      style={{
                        flex: 1,
                        height: 4,
                        marginHorizontal: 4,
                        borderRadius: 2,
                        backgroundColor: i < currentIndex ? '#F9EF08' : '#EEEEEE',
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
