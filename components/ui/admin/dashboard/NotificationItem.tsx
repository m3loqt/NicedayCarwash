import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface NotificationItemProps {
  appointmentId: string;
  vehicleClassification: string;
  dateTime: string;
  amount: string;
  status?: string;
  isPaid?: boolean;
  isLast?: boolean;
}

export default function NotificationItem({
  appointmentId,
  vehicleClassification,
  dateTime,
  amount,
  status,
  isPaid,
  isLast = false,
}: NotificationItemProps) {
  const isWaitingForPayment = status === 'accepted' && !isPaid;
  const notificationText = isWaitingForPayment ? 'Waiting for Payment' : 'Pending Reservation';
  
  return (
    <View className={`px-6 py-2 mb-2 mt-1 ${isLast ? '' : 'border-b border-gray-100'}`} style={{ backgroundColor: 'transparent' }}>
      <View className="flex-row items-center mb-1">
        <Ionicons name="notifications" size={16} color="#F9EF08" />
        <Text className="text-[#F9EF08] text-base font-normal ml-1" style={{ fontFamily: 'Inter_400Regular' }}>
          {notificationText}
        </Text>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-[#1E1E1E] text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
          {appointmentId} - {vehicleClassification || 'Vehicle'}
        </Text>
        <Text className="text-[#1E1E1E] text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
          {amount}
        </Text>
      </View>

      <Text className="text-gray-500 text-sm font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
        {dateTime}
      </Text>
    </View>
  );
}

