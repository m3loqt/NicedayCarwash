import { Text, TouchableOpacity, View } from 'react-native';

export type BayStatus = 'available' | 'unavailable' | 'selected';

interface BayButtonProps {
  bayNumber: number;
  status: BayStatus;
  onPress: () => void;
}

/**
 * Individual bay button component
 * Handles three states: available (yellow background), unavailable (gray), and selected (white with yellow border)
 */
export default function BayButton({ bayNumber, status, onPress }: BayButtonProps) {
  const getWrapperStyles = () => {
    switch (status) {
      case 'selected':
        return 'border-2 border-[#F9EF08] rounded-xl p-1';
      case 'available':
        return 'border-2 border-transparent rounded-xl p-1';
      case 'unavailable':
        return 'border-2 border-transparent rounded-xl p-1';
      default:
        return 'border-2 border-transparent rounded-xl p-1';
    }
  };

  const getButtonStyles = () => {
    switch (status) {
      case 'selected':
        return 'bg-[#F9EF08]';
      case 'available':
        return 'bg-[#F9EF08]';
      case 'unavailable':
        return 'bg-gray-200';
      default:
        return 'bg-gray-200';
    }
  };

  const getTextStyles = () => {
    switch (status) {
      case 'selected':
        return 'text-white';
      case 'available':
        return 'text-white';
      case 'unavailable':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  return (
    <View className={getWrapperStyles()}>
      <TouchableOpacity
        className={`rounded-lg py-4 px-6 items-center justify-center ${getButtonStyles()}`}
        onPress={onPress}
        disabled={status === 'unavailable'}
        activeOpacity={status === 'unavailable' ? 1 : 0.7}
      >
        <Text
          className={`text-lg font-bold ${getTextStyles()}`}
          style={{ fontFamily: 'Inter_700Bold' }}
        >
          Bay {bayNumber}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
