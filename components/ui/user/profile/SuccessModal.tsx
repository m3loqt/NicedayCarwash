import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

export default function SuccessModal({ visible, message, onDismiss }: SuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        className="flex-1 bg-black/40 items-center justify-end"
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="bg-white w-full rounded-t-xl items-center px-8 pt-10 pb-12"
        >
          {/* Handle bar */}
          <View className="w-10 h-1 rounded-full bg-[#E0E0E0] mb-8" />

          {/* Icon */}
          <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-6">
            <Ionicons name="checkmark-circle-outline" size={30} color="#1A1A1A" />
          </View>

          {/* Message */}
          <Text className="text-[17px] font-bold text-[#1A1A1A] text-center mb-6">
            {message}
          </Text>

          <TouchableOpacity
            className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center"
            activeOpacity={0.85}
            onPress={onDismiss}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">OK</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
