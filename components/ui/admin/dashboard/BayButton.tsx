import { Text, TouchableOpacity } from 'react-native';

export type BayStatus = 'available' | 'unavailable' | 'selected';

interface BayButtonProps {
  bayNumber: number;
  status: BayStatus;
  onPress: () => void;
}

export default function BayButton({ bayNumber, status, onPress }: BayButtonProps) {
  const isUnavailable = status === 'unavailable';
  const isSelected = status === 'selected';

  const bgColor = isSelected
    ? 'bg-white border-2 border-[#F9EF08]'
    : isUnavailable
    ? 'bg-[#F5F5F5]'
    : 'bg-white border border-[#D4D4D4]';

  const textColor = isSelected
    ? 'text-[#1A1A1A]'
    : isUnavailable
    ? 'text-[#C0C0C0]'
    : 'text-[#1A1A1A]';

  return (
    <TouchableOpacity
      className={`rounded-xl py-4 px-3 items-center justify-center ${bgColor}`}
      onPress={onPress}
      disabled={isUnavailable}
      activeOpacity={isUnavailable ? 1 : 0.75}
    >
      <Text
        className={`text-[14px] font-bold ${textColor}`}
        style={{ fontFamily: 'Inter_700Bold' }}
      >
        Bay {bayNumber}
      </Text>
    </TouchableOpacity>
  );
}
