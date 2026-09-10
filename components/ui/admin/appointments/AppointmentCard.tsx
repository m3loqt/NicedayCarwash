import { Ionicons } from '@expo/vector-icons';
import { Image, ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';

// classification is the human-readable label stored on the booking (see ServicesStep.tsx's
// getVehicleLabel - "Sedan", "SUV", "Pickup", "Motorcycle (S)", "Motorcycle (L)"), not the raw
// vtype key, so this matches on substrings rather than an exact key lookup. Same art already
// used on the customer Vehicles screen - no new asset needed.
const vehicleImageFor = (classification: string): ImageSourcePropType => {
  const c = classification.toLowerCase();
  if (c.includes('suv')) return require('../../../../assets/images/suv.png');
  if (c.includes('pickup')) return require('../../../../assets/images/pickup.png');
  if (c.includes('motorcycle') && c.includes('(l)')) return require('../../../../assets/images/motobig.png');
  if (c.includes('motorcycle')) return require('../../../../assets/images/motosmall.png');
  return require('../../../../assets/images/sedan.png');
};

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
  onNoShow?: () => void;
  onViewMore?: () => void;
}

export default function AppointmentCard({
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
  onNoShow,
  onViewMore,
}: AppointmentCardProps) {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);
  const formattedAmount = `₱${amountDue.toFixed(2)}`;
  // Completed/cancelled cards render no action buttons below, so the extra bottom padding and
  // row margin meant to lead into those buttons would otherwise just be dead space under the
  // vehicle row - symmetric padding on the whole card looks right when there's nothing below it.
  const hasActions = status === 'pending' || status === 'accepted' || status === 'ongoing';

  return (
    <TouchableOpacity
      className={`bg-white rounded-2xl px-4 mx-5 mb-1.5 ${hasActions ? 'pt-2 pb-4' : 'py-4'}`}
      activeOpacity={0.8}
      onPress={onViewMore}
    >
      {/* Vehicle icon + details row, mirroring the customer BookingCard layout */}
      <View className={`flex-row items-center ${hasActions ? 'mb-3' : ''}`}>
        <View className="w-[60px] h-[60px] rounded-xl bg-[#FAFAFA] items-center justify-center mr-3">
          <Image source={vehicleImageFor(classification)} style={{ width: 52, height: 38 }} resizeMode="contain" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-[10px] font-bold text-[#999] uppercase tracking-wide mb-0.5" numberOfLines={1}>
            {classification}
          </Text>
          <Text className="text-[15px] font-semibold text-[#1A1A1A] mb-1" numberOfLines={1}>
            {vehicleName}
          </Text>
          <Text className="text-[12px] text-[#999]">
            {formattedDate} · {formattedTime}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-[15px] font-bold text-[#1A1A1A] mr-1">
            {formattedAmount}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
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
      ) : status === 'accepted' ? (
        // Deliberately just Cancel, not Start Wash/No-Show - the "no buttons in Confirmed"
        // decision was about removing the wash-starting tap (client: extra friction), not about
        // removing the ability to cancel a booking before its time arrives. A customer calling
        // ahead to cancel needs a path that doesn't require waiting for the auto-trigger to move
        // this to Ongoing first.
        <View className="flex-row">
          <TouchableOpacity
            className="flex-1 bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg py-3 items-center"
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Text className="text-[13px] font-semibold text-[#1A1A1A]">Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'ongoing' ? (
        // Ongoing is now where every real decision lives, not just Complete. Confirmed carries
        // no Start Wash (client decision - the scheduled time alone triggers the move here), so
        // "Ongoing" no longer reliably means a human confirmed the car showed up - it just means
        // the clock passed the scheduled time. No-Show has to live here rather than on Confirmed,
        // since by the time anyone's looking at this, that's exactly the question in play.
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="flex-1 bg-[#F9EF08] rounded-lg py-3 items-center"
            onPress={onComplete}
            activeOpacity={0.85}
          >
            <Text className="text-[13px] font-bold text-[#1A1A00]">Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-[#FAFAFA] rounded-lg py-2.5 px-3 items-center"
            onPress={onNoShow}
            activeOpacity={0.85}
          >
            <Text className="text-[11px] font-semibold text-[#1A1A1A]">No-Show</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-[#FAFAFA] rounded-lg py-2.5 px-3 items-center"
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Text className="text-[11px] font-semibold text-[#1A1A1A]">Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

