import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface NotificationItemProps {
  appointmentId: string;
  vehicleClassification: string;
  dateTime: string;
  amount: string;
  status?: string;
  isPaid?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}

export default function NotificationItem({
  appointmentId,
  vehicleClassification,
  dateTime,
  amount,
  status,
  isPaid,
  isLast = false,
  onPress,
}: NotificationItemProps) {
  const isWaitingForPayment = status === 'accepted' && !isPaid;
  const notificationText = isWaitingForPayment ? 'Waiting for Payment' : 'Pending Reservation';

  const content = (
    <>
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Ionicons name="notifications" size={16} color="#F9EF08" />
          <Text className="text-[#F9EF08] text-base font-normal ml-1" style={{ fontFamily: 'Inter_400Regular' }}>
            {notificationText}
          </Text>
        </View>
        <Text className="text-[#1E1E1E] text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
          {appointmentId} - {vehicleClassification || 'Vehicle'}
        </Text>
        <Text className="text-gray-500 text-sm font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
          {dateTime}
        </Text>
      </View>
      <Text className="text-[#1E1E1E] text-xl font-bold ml-3" style={{ fontFamily: 'Inter_700Bold' }}>
        {amount}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="px-6 py-2 mb-2 mt-1 flex-row items-end justify-between"
        style={{ backgroundColor: 'transparent' }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="px-6 py-2 mb-2 mt-1 flex-row items-end justify-between" style={{ backgroundColor: 'transparent' }}>
      {content}
    </View>
  );
}
