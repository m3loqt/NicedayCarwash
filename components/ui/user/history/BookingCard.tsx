import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

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
  id, 
  branchName, 
  address,
  appointmentId,
  appointmentDate,
  amount,
  status, 
  vehicleName,
  plateNumber,
  classification,
  onPress,
  onViewMore
}: BookingCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Transaction Completed', color: 'text-green-600', icon: 'checkmark-circle', useCustomIcon: false };
      case 'pending':
        return { text: 'Pending Transaction', color: 'text-yellow-300', icon: 'pending', useCustomIcon: true };
      case 'cancelled':
        return { text: 'Transaction Cancelled', color: 'text-red-600', icon: 'close-circle', useCustomIcon: false };
      case 'ongoing':
        return { text: 'Ongoing Transaction', color: 'text-purple-600', icon: 'ongoing', useCustomIcon: true };
      default:
        return { text: 'Unknown Status', color: 'text-gray-600', icon: 'help-circle', useCustomIcon: false };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <TouchableOpacity 
      className="bg-white rounded-xl p-4 mb-4 shadow-md mx-4"
      onPress={onPress}
    >
      {/* Status Header */}
      <View className="flex-row items-center mb-3">
        {statusInfo.useCustomIcon ? (
          <Image 
            source={
              status === 'pending' 
                ? require('../../../../assets/images/pending.png')
                : require('../../../../assets/images/ongoing.png')
            }
            className="w-5 h-5 mr-2"
            resizeMode="contain"
            style={{ tintColor: status === 'ongoing' ? '#9333EA' : undefined }}
          />
        ) : (
          <Ionicons 
            name={statusInfo.icon} 
            size={20} 
            color={status === 'completed' ? '#059669' : status === 'cancelled' ? '#DC2626' : '#6B7280'} 
            className="mr-2"
          />
        )}
        <Text className={`text-sm font-semibold ${statusInfo.color}`}>
          {statusInfo.text}
        </Text>
      </View>

      {/* Branch Info and Image */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-4">
          <Text className="text-xl font-bold text-[#1E1E1E] mb-1">{branchName}</Text>
          <Text className="text-sm text-gray-600">{address}</Text>
        </View>
        <Image 
          source={require('../../../../assets/images/samplebranch.png')}
          className="w-16 h-16 rounded-lg"
          resizeMode="cover"
        />
      </View>

      {/* Booking Details Grid - Row 1 */}
      <View className="flex-row justify-between mb-2">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Appointment ID</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{appointmentId}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Appointment Date</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{appointmentDate}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Amount Due</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{amount}</Text>
        </View>
      </View>

      {/* Vehicle Details - Row 2 (if provided) */}
      {vehicleName && plateNumber && classification && (
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Vehicle Name</Text>
            <Text className="text-sm font-bold text-[#1E1E1E]">{vehicleName}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Plate Number</Text>
            <Text className="text-sm font-bold text-[#1E1E1E]">{plateNumber}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Classification</Text>
            <Text className="text-sm font-bold text-[#1E1E1E]">{classification}</Text>
          </View>
        </View>
      )}

      {/* View More (centered, underlined) */}
      <View className="mt-4 items-center">
        <TouchableOpacity onPress={() => (onViewMore ? onViewMore() : onPress ? onPress() : undefined)}>
          <Text className="text-sm text-gray-700 underline">View More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
