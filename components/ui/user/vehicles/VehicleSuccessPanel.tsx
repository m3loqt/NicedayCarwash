import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VehicleSuccessPanelProps {
  message: string;
  onContinue: () => void;
  iconType?: 'success' | 'delete';
}

export default function VehicleSuccessPanel({
  message,
  onContinue,
  iconType = 'success',
}: VehicleSuccessPanelProps) {
  const isDelete = iconType === 'delete';

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
      <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-5">
        <Ionicons
          name={isDelete ? 'trash-outline' : 'checkmark-circle-outline'}
          size={30}
          color={isDelete ? '#DC2626' : '#1A1A1A'}
        />
      </View>

      <Text className="text-[18px] font-bold text-[#1A1A1A] text-center mb-1.5">
        {isDelete ? 'Vehicle Removed' : 'Success'}
      </Text>

      <Text className="text-[12px] text-[#999] text-center mb-6 px-2">{message}</Text>

      <TouchableOpacity
        className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center"
        activeOpacity={0.85}
        onPress={onContinue}
      >
        <Text className="text-[14px] font-bold text-[#1A1A00]">Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
