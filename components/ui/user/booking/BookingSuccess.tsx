import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BookingSuccess() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  
  return (
    <View className="flex-1 items-center justify-center bg-[#F8F8F8] p-6">
      {/* Calendar Icon with Checkmark */}
      <View className="relative mb-6">
        <View className="w-32 h-32 rounded-full bg-[#F9EF08] items-center justify-center shadow-lg">
          <Ionicons name="calendar" size={56} color="white" />
        </View>
        {/* Checkmark Circle Overlapping */}
        <View className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white items-center justify-center shadow-md">
          <Ionicons name="checkmark" size={20} color="#F9EF08" />
        </View>
      </View>

      {/* Appointment Confirmed Heading */}
      <Text 
        className="font-bold mb-2 text-center" 
        style={{ 
          fontSize: 32, 
          color: '#1E1E1E',
          textShadowColor: 'rgba(0, 0, 0, 0.1)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4
        }}
      >
        Appointment Confirmed
      </Text>

      {/* Description */}
      <Text 
        className="mb-8 text-center" 
        style={{ 
          fontSize: 16, 
          color: '#1E1E1E' 
        }}
      >
        Your appointment ID is {appointmentId || 'ND-2024-01'}
      </Text>

      {/* My Bookings Button */}
      <TouchableOpacity 
        className="w-full bg-[#F9EF08] py-4 rounded-xl mb-3" 
        onPress={() => router.push({ pathname: '/user/(tabs)/history' } as any)}
      >
        <Text className="text-center font-semibold" style={{ fontSize: 16, color: '#1E1E1E' }}>My Bookings</Text>
      </TouchableOpacity>

      {/* Home Button */}
      <TouchableOpacity 
        className="w-full border border-[#F9EF08] bg-white py-4 rounded-xl" 
        onPress={() => router.push({ pathname: '/user' } as any)}
      >
        <Text className="text-center font-semibold" style={{ fontSize: 16, color: '#F9EF08' }}>Home</Text>
      </TouchableOpacity>
    </View>
  );
}
