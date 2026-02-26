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
          className="bg-white w-full rounded-t-3xl items-center px-8 pt-10 pb-12"
        >
          {/* Handle bar */}
          <View className="w-10 h-1 rounded-full bg-[#E0E0E0] mb-8" />

          {/* Radial rings + icon */}
          <View className="items-center justify-center mb-6" style={{ width: 140, height: 140 }}>
            {/* Outer ring */}
            <View
              className="absolute rounded-full border border-[#E8F4FD]"
              style={{ width: 140, height: 140 }}
            />
            {/* Middle ring */}
            <View
              className="absolute rounded-full border border-[#D0EAFB]"
              style={{ width: 110, height: 110 }}
            />
            {/* Inner ring */}
            <View
              className="absolute rounded-full border border-[#B8DFF8]"
              style={{ width: 80, height: 80 }}
            />
            {/* Icon circle */}
            <View
              className="rounded-full bg-[#4A9FE5] items-center justify-center"
              style={{ width: 56, height: 56 }}
            >
              <Ionicons name="checkmark" size={30} color="#FFFFFF" />
            </View>
          </View>

          {/* Message */}
          <Text className="text-[17px] font-bold text-[#1A1A1A] text-center">
            {message}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
