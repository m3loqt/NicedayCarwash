import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

// Formats date to "Tue, Dec. 20, 2024" format
const formatDate = (dateString: string): string => {
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month - 1, day);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan.',
    'Feb.',
    'Mar.',
    'Apr.',
    'May',
    'Jun.',
    'Jul.',
    'Aug.',
    'Sep.',
    'Oct.',
    'Nov.',
    'Dec.',
  ];

  const dayName = dayNames[date.getDay()];
  const monthName = monthNames[month - 1];

  return `${dayName}, ${monthName} ${day}, ${year}`;
};

// Formats time to "8:00 AM" format
const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  // Returning as-is if time is already in 12-hour format
  if (timeString.includes('AM') || timeString.includes('PM')) {
    return timeString;
  }
  // Converting 24-hour format (HH:MM) to 12-hour format
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes || '00'} ${ampm}`;
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

interface AppointmentCardProps {
  appointmentId: string;
  date: string;
  time: string;
  vehicleName: string;
  classification: string;
  amountDue: number;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  isPaid?: boolean;
  cancelledAt?: string;
  completedAt?: string;
  onAccept?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onViewMore?: () => void;
}

export default function AppointmentCard({
  appointmentId,
  date,
  time,
  vehicleName,
  classification,
  amountDue,
  status,
  isPaid,
  cancelledAt,
  completedAt,
  onAccept,
  onCancel,
  onComplete,
  onViewMore,
}: AppointmentCardProps) {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);
  const formattedAmount = `₱${amountDue.toFixed(2)}`;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Transaction Completed', color: 'text-green-600', icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap, useCustomIcon: false };
      case 'pending':
        return { text: 'Pending Transaction', color: 'text-yellow-300', icon: 'pending' as any, useCustomIcon: true };
      case 'accepted':
        return { text: 'Pending Transaction', color: 'text-yellow-300', icon: 'pending' as any, useCustomIcon: true };
      case 'cancelled':
        return { text: 'Transaction Cancelled', color: 'text-red-600', icon: 'close-circle' as keyof typeof Ionicons.glyphMap, useCustomIcon: false };
      case 'ongoing':
        return { text: 'Ongoing Transaction', color: 'text-purple-600', icon: 'ongoing' as any, useCustomIcon: true };
      default:
        return { text: 'Unknown Status', color: 'text-gray-600', icon: 'help-circle' as keyof typeof Ionicons.glyphMap, useCustomIcon: false };
    }
  };

  const statusInfo = getStatusInfo(status);
  const showWaitingForPayment = status === 'accepted' && !isPaid;

  return (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-md mx-4">
      {/* Status Header */}
      <View className="flex-row items-center justify-between mb-3">
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
              name={statusInfo.icon as any} 
              size={14} 
              color={status === 'completed' ? '#059669' : status === 'cancelled' ? '#DC2626' : '#6B7280'} 
              className="mr-2"
            />
          )}
          <Text className={`text-sm font-semibold ${statusInfo.color}`}>
            {statusInfo.text}
          </Text>
        </View>
        {showWaitingForPayment && (
          <View className="bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-amber-700 text-xs font-semibold">Waiting for Payment</Text>
          </View>
        )}
      </View>

      {/* Appointment Details Grid - Row 1: Appointment ID | Date | Time */}
      <View className="flex-row justify-between mb-2">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Appointment ID</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{appointmentId}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Date</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{formattedDate}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Time</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{formattedTime}</Text>
        </View>
      </View>

      {/* Vehicle Details Grid - Row 2: Vehicle Name | Classification | Amount Due */}
      <View className="flex-row justify-between mb-4">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Vehicle Name</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{vehicleName}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Classification</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{classification}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Amount Due</Text>
          <Text className="text-sm font-bold text-[#1E1E1E]">{formattedAmount}</Text>
        </View>
      </View>

      {/* Action Buttons and View More - Show buttons for pending and ongoing status */}
      {status === 'pending' ? (
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="flex-1 bg-[#F9EF08] rounded-md py-3 items-center"
            onPress={onAccept}
          >
            <Text className="text-white font-semibold">Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-[#F9EF08] rounded-md py-3 items-center bg-white"
            onPress={onCancel}
          >
            <Text className="text-[#F9EF08] font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewMore}>
            <Text className="text-sm text-gray-700 underline">View More</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'ongoing' ? (
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="flex-1 bg-[#F9EF08] rounded-md py-3 items-center"
            onPress={onComplete}
          >
            <Text className="text-white font-semibold">Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-[#F9EF08] rounded-md py-3 items-center bg-white"
            onPress={onCancel}
          >
            <Text className="text-[#F9EF08] font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewMore}>
            <Text className="text-sm text-gray-700 underline">View More</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row justify-between items-center">
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
          <TouchableOpacity onPress={onViewMore}>
            <Text className="text-sm text-gray-700 underline">View More</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

