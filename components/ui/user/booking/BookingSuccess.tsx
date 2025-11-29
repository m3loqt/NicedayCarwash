import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BookingSuccess() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <View className="w-32 h-32 rounded-full bg-[#F9EF08] items-center justify-center mb-6 shadow-lg">
        <Ionicons name="calendar" size={56} color="white" />
      </View>
      <Text className="text-2xl font-bold mb-2">Appointment Confirmed</Text>
      <Text className="text-sm text-gray-600 mb-8">Your appointment has been scheduled successfully.</Text>

      <TouchableOpacity className="w-full bg-[#F9EF08] py-4 rounded-xl mb-3" onPress={() => router.push({ pathname: '/user/(tabs)/history' } as any)}>
        <Text className="text-center text-white font-semibold">My Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity className="w-full border border-[#F9EF08] py-4 rounded-xl" onPress={() => router.push({ pathname: '/user' } as any)}>
        <Text className="text-center text-[#F9EF08] font-semibold">Home</Text>
      </TouchableOpacity>
    </View>
  );
}
