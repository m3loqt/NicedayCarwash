import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

interface ActiveBooking {
  appointmentId: string;
  vehicleName: string;
  plateNumber: string;
  time: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  pendingCount?: number;
}

interface ActiveBookingBarProps {
  booking: ActiveBooking | null;
  pendingCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting confirmation',
  accepted: 'Confirmed — waiting',
  ongoing: 'Wash in progress',
};

const STATUS_TAB: Record<string, string> = {
  pending: 'pending',
  accepted: 'pending',
  ongoing: 'ongoing',
};

export default function ActiveBookingBar({ booking, pendingCount }: ActiveBookingBarProps) {
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
  }, [booking?.appointmentId]);

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
  }, [booking?.status]);

  if (!booking) return null;

  const tab = STATUS_TAB[booking.status] ?? 'pending';
  const label = STATUS_LABEL[booking.status] ?? '';

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 92, // above tab bar
        paddingHorizontal: 16,
        paddingTop: 8,
        pointerEvents: 'box-none',
      }}
    >
      <TouchableOpacity
        onPress={() => router.push(`/admin/bookings?tab=${tab}` as any)}
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
          {/* Status dot */}
          <View className="mr-3 items-center justify-center">
            {booking.status === 'ongoing' ? (
              <View className="w-8 h-8 rounded-full bg-[#DBEAFE] items-center justify-center">
                <Animated.View
                  className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"
                  style={{ opacity: pulseAnim }}
                />
              </View>
            ) : (
              <View className="w-8 h-8 rounded-full bg-[#FEFCE8] items-center justify-center">
                <Ionicons name="time-outline" size={16} color="#CA8A04" />
              </View>
            )}
          </View>

          {/* Info */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[13px] font-bold text-[#1A1A1A]" numberOfLines={1}>
                {booking.vehicleName}
              </Text>
              <Text className="text-[12px] text-[#BDBDBD]">·</Text>
              <Text className="text-[12px] text-[#999]">{booking.time}</Text>
            </View>
            <Text className="text-[11px] text-[#999] mt-0.5">{label}</Text>
          </View>

          {/* Pending count badge + chevron */}
          <View className="flex-row items-center gap-2">
            {pendingCount > 1 && (
              <View className="bg-[#F5F5F5] rounded-full px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-[#666]">
                  +{pendingCount - 1} more
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
