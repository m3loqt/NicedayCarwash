import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

type BookingStatus = 'pending' | 'accepted' | 'ongoing';

interface ActiveBooking {
  appointmentId: string;
  dateKey: string;
  branchName: string;
  time: string;
  status: BookingStatus;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Awaiting confirmation',
  accepted: 'Confirmed',
  ongoing: 'Wash in progress',
};

// Higher priority wins when a customer has more than one active booking at once.
const STATUS_PRIORITY: Record<BookingStatus, number> = {
  ongoing: 2,
  accepted: 1,
  pending: 0,
};

export default function ActiveBookingBar() {
  const { hidden } = useTabBarVisibility();
  const tabBarClearance = useTabBarClearance(12);
  const [booking, setBooking] = useState<ActiveBooking | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

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
    });

    return () => unsubscribe();
  }, []);

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

  if (!booking || hidden) return null;

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
        <View className="bg-white rounded-2xl px-4 py-3.5 flex-row items-center border border-[#F0F0F0]">
          {/* Status icon - monochrome gray in a neutral badge; icon shape carries the meaning, not color */}
          <View className="mr-3 items-center justify-center">
            <View className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center">
              {booking.status === 'ongoing' ? (
                <Animated.View style={{ opacity: pulseAnim }}>
                  <Ionicons name="water" size={16} color="#666666" />
                </Animated.View>
              ) : (
                <Ionicons
                  name={booking.status === 'accepted' ? 'checkmark-circle-outline' : 'time-outline'}
                  size={16}
                  color="#666666"
                />
              )}
            </View>
          </View>

          {/* Info */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[13px] font-bold text-[#1A1A1A]" numberOfLines={1}>
                {booking.branchName}
              </Text>
              {!!booking.time && (
                <>
                  <Text className="text-[12px] text-[#BDBDBD]">·</Text>
                  <Text className="text-[12px] text-[#999]">{booking.time}</Text>
                </>
              )}
            </View>
            <Text className="text-[11px] text-[#999] mt-0.5">{STATUS_LABEL[booking.status]}</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
