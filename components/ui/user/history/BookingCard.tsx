import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import PaymentBadge from '../payment/PaymentBadge';
import PaymentButton from '../payment/PaymentButton';

// Converts MM-DD-YYYY date string to abbreviated format (e.g., "Dec. 6, 2025")
const formatDateForHistory = (dateString: string): string => {
  // Splitting date string into month, day, and year components
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString; // Returning as-is if format is unexpected
  
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  const monthNames = [
    'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
    'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'
  ];
  
  if (month < 1 || month > 12) return dateString;
  
  return `${monthNames[month - 1]} ${day}, ${year}`;
};

// Formats ISO date string to "Month Day, Year" format (e.g., "July 20, 2024")
const formatStatusDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handling ISO format dates (e.g., "2024-07-20T10:30:00.000Z")
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Trying MM-DD-YYYY format if not a valid ISO date
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        if (month >= 1 && month <= 12) {
          return `${monthNames[month - 1]} ${day}, ${year}`;
        }
      }
      return dateString;
    }
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  } catch (error) {
    return dateString;
  }
};

interface BookingCardProps {
  id: string;
  branchName: string;
  address: string;
  appointmentId: string;
  appointmentDate: string;
  amount: string;
  status: 'completed' | 'pending' | 'accepted' | 'cancelled' | 'ongoing';
  isPaid?: boolean;
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  cancelledAt?: string;
  completedAt?: string;
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
  isPaid,
  vehicleName,
  plateNumber,
  classification,
  cancelledAt,
  completedAt,
  onPress,
  onViewMore
}: BookingCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Transaction Completed', color: 'text-green-600', icon: 'checkmark-circle' as const, useCustomIcon: false };
      case 'pending':
      case 'accepted':
        return { text: 'Pending Transaction', color: 'text-yellow-300', icon: 'pending', useCustomIcon: true };
      case 'cancelled':
        return { text: 'Transaction Cancelled', color: 'text-red-600', icon: 'close-circle' as const, useCustomIcon: false };
      case 'ongoing':
        return { text: 'Ongoing Transaction', color: 'text-purple-600', icon: 'ongoing', useCustomIcon: true };
      default:
        return { text: 'Unknown Status', color: 'text-gray-600', icon: 'help-circle' as const, useCustomIcon: false };
    }
  };

  const statusInfo = getStatusInfo(status);
  const showPaymentBadge = status === 'accepted' && !isPaid;
  const showPaymentButton = status === 'accepted' && !isPaid;

  const handlePaymentPress = () => {
    router.push({
      pathname: '/user/payment',
      params: { appointmentId },
    } as any);
  };

  return (
    <TouchableOpacity 
      className="bg-white rounded-xl p-4 mb-4 shadow-md mx-4"
      onPress={onPress}
    >
      {/* Status Header with fixed image position */}
      <View className="relative mb-3">
        <View className="flex-row items-center justify-between pr-[68px]">
          <View className="flex-row items-center flex-1">
            {statusInfo.useCustomIcon ? (
              <Image 
                source={
                  status === 'pending' || status === 'accepted'
                    ? require('../../../../assets/images/pending.png')
                    : require('../../../../assets/images/ongoing.png')
                }
                className="w-3 h-3 mr-2"
                resizeMode="contain"
                style={{ tintColor: status === 'ongoing' ? '#9333EA' : undefined }}
              />
            ) : (
              <Ionicons 
                name={statusInfo.icon} 
                size={14} 
                color={status === 'completed' ? '#059669' : status === 'cancelled' ? '#DC2626' : '#6B7280'} 
                className="mr-2"
              />
            )}
            <Text className={`text-sm font-semibold ${statusInfo.color}`}>
              {statusInfo.text}
            </Text>
          </View>
          {showPaymentBadge && <PaymentBadge />}
        </View>
        <View className="absolute top-0 right-0">
          <Image 
            source={require('../../../../assets/images/samplebranch.png')}
            className="w-16 h-16 rounded-lg"
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Branch Info */}
      <View className="mb-4 pr-[68px]">
        <Text className="text-xl font-bold text-[#1E1E1E] mb-1">{branchName}</Text>
        <Text className="text-sm text-gray-600">{address}</Text>
      </View>

      {/* Booking Details Grid - Row 1 */}
      <View className="flex-row justify-between mb-2">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Appointment ID</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{appointmentId}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Appointment Date</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{formatDateForHistory(appointmentDate)}</Text>
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

      {/* Payment Button */}
      {showPaymentButton && (
        <View className="mt-4 mb-3">
          <PaymentButton onPress={handlePaymentPress} />
        </View>
      )}

      {/* Status Date and View More (aligned horizontally) */}
      <View className="mt-4 flex-row justify-between items-center">
        {(status === 'cancelled' && cancelledAt) || (status === 'completed' && completedAt) ? (
          <Text className="text-sm text-gray-600">
            {status === 'cancelled' 
              ? `Canceled on ${formatStatusDate(cancelledAt!)}`
              : `Completed on ${formatStatusDate(completedAt!)}`
            }
          </Text>
        ) : (
          <View />
        )}
        <TouchableOpacity onPress={() => (onViewMore ? onViewMore() : onPress ? onPress() : undefined)}>
          <Text className="text-sm text-gray-700 underline">View More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
