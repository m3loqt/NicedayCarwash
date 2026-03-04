import { Text, TouchableOpacity, View } from 'react-native';

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

  return (
    <TouchableOpacity
      className="bg-[#FAFAFA] rounded-2xl px-4 pt-2 pb-4 mx-5 mb-1.5"
      activeOpacity={0.8}
      onPress={onViewMore}
    >
      {/* ID on left, above vehicle */}
      <View className="mb-3">
        <Text className="text-[11px] text-[#999]">
          ID: <Text className="font-semibold text-[#1A1A1A]">{appointmentId}</Text>
        </Text>
      </View>

      {/* Vehicle and date/time row with price aligned */}
      <View className="mb-3">
        <Text className="text-[16px] font-semibold text-[#1A1A1A] mb-1.5">
          {vehicleName} · {classification}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] text-[#999] flex-1">
            {formattedDate} · {formattedTime}
          </Text>
          <Text className="text-[15px] font-bold text-[#1A1A1A] ml-2">
            {formattedAmount}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      {status === 'pending' ? (
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-[#F9EF08] rounded-lg py-3 items-center"
            onPress={onAccept}
            activeOpacity={0.85}
          >
            <Text className="text-[13px] font-bold text-[#1A1A00]">Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg py-3 items-center"
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Text className="text-[13px] font-semibold text-[#1A1A1A]">Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'ongoing' ? (
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-[#F9EF08] rounded-lg py-3 items-center"
            onPress={onComplete}
            activeOpacity={0.85}
          >
            <Text className="text-[13px] font-bold text-[#1A1A00]">Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg py-3 items-center"
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Text className="text-[13px] font-semibold text-[#1A1A1A]">Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

