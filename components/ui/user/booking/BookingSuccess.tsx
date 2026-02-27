import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BookingSuccess() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">

      {/* Icon */}
      <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-5">
        <Ionicons name="checkmark-circle-outline" size={30} color="#1A1A1A" />
      </View>

      {/* Title */}
      <Text className="text-[18px] font-bold text-[#1A1A1A] text-center mb-1.5">
        Appointment Confirmed
      </Text>

      {/* Appointment ID */}
      <Text className="text-[12px] text-[#999] text-center mb-8">
        Your appointment ID is{' '}
        <Text className="font-semibold text-[#1A1A1A]">{appointmentId || 'ND-000000'}</Text>
      </Text>

      {/* My Bookings */}
      <TouchableOpacity
        className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center mb-3"
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/user/(tabs)/history' } as any)}
      >
        <Text className="text-[14px] font-bold text-[#1A1A00]">My Bookings</Text>
      </TouchableOpacity>

      {/* Home */}
      <TouchableOpacity
        className="w-full bg-[#FAFAFA] border border-[#EEEEEE] py-3.5 rounded-2xl items-center"
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/user' } as any)}
      >
        <Text className="text-[14px] font-semibold text-[#1A1A1A]">Go Home</Text>
      </TouchableOpacity>

    </View>
  );
}
