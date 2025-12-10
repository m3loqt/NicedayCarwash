import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface PaymentButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export default function PaymentButton({ onPress, disabled = false }: PaymentButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`py-3 px-6 rounded-xl flex-row items-center justify-center ${
        disabled ? 'bg-gray-300' : 'bg-[#F9EF08]'
      }`}
      activeOpacity={0.8}
    >
      <Ionicons name="card" size={20} color={disabled ? '#9CA3AF' : '#1E1E1E'} style={{ marginRight: 8 }} />
      <Text className={`font-semibold text-lg ${disabled ? 'text-gray-500' : 'text-[#1E1E1E]'}`}>
        Pay Booking Fee
      </Text>
    </TouchableOpacity>
  );
}

