import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

const formatDate = (dateString: string): string => {
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  if (month < 1 || month > 12) return dateString;
  return `${months[month - 1]} ${day}, ${year}`;
};

interface BookingCardProps {
  id: string;
  branchName: string;
  address: string;
  appointmentId: string;
  appointmentDate: string;
  amount: string;
  status: 'completed' | 'pending' | 'cancelled' | 'ongoing';
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  onPress?: () => void;
  onViewMore?: () => void;
}

export default function BookingCard({
  branchName,
  address,
  appointmentDate,
  amount,
  onPress,
}: BookingCardProps) {
  return (
    <TouchableOpacity
      className="bg-[#FAFAFA] rounded-2xl px-3 py-5 mx-5 mb-1.5 flex-row items-center"
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Branch image */}
      <Image
        source={require('../../../../assets/images/samplebranch.png')}
        className="rounded-xl mr-4"
        style={{ width: 60, height: 60 }}
        resizeMode="cover"
      />

      {/* Left content */}
      <View className="flex-1 mr-3">
        <Text className="text-[16px] font-bold text-[#1A1A1A] mb-1" numberOfLines={1}>
          {branchName}
        </Text>
        <Text className="text-[13px] text-[#999] mb-1">
          {formatDate(appointmentDate)}
        </Text>
        <Text className="text-[13px] text-[#BDBDBD]" numberOfLines={1}>
          {address}
        </Text>
      </View>

      {/* Right: amount + chevron */}
      <View className="flex-row items-center">
        <Text className="text-[16px] font-bold text-[#1A1A1A] mr-2">
          {amount}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
      </View>
    </TouchableOpacity>
  );
}
