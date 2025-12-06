import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface NotificationItemProps {
  appointmentId: string;
  vehicleClassification: string;
  dateTime: string;
  amount: string;
}

export default function NotificationItem({
  appointmentId,
  vehicleClassification,
  dateTime,
  amount,
}: NotificationItemProps) {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3">
      <View className="flex-row items-center mb-2">
        <Ionicons name="person" size={16} color="white" />
        <Text className="text-[#F9EF08] text-xs font-normal ml-1" style={{ fontFamily: 'Inter_400Regular' }}>
          Pending Reservation
        </Text>
      </View>

      <Text className="text-gray-900 text-base font-bold mb-1" style={{ fontFamily: 'Inter_700Bold' }}>
        {appointmentId} - {vehicleClassification || 'Vehicle'}
      </Text>

      <Text className="text-gray-900 text-sm font-normal mb-2" style={{ fontFamily: 'Inter_400Regular' }}>
        {dateTime}
      </Text>

      <View className="flex-row justify-end">
        <Text className="text-gray-900 text-base font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
          {amount}
        </Text>
      </View>
    </View>
  );
}

