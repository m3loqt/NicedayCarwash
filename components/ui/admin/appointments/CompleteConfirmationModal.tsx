import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface CompleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CompleteConfirmationModal({
  visible,
  onClose,
  onConfirm,
}: CompleteConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-xl">
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
            <Text className="text-[17px] font-bold text-[#1A1A1A]">Mark as Complete</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <View className="h-[0.5px] bg-[#F0F0F0]" />

          {/* Body */}
          <View className="px-5 py-6">
            <View className="bg-[#FAFAFA] rounded-2xl px-4 py-4 flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" style={{ marginTop: 1, marginRight: 10 }} />
              <Text className="text-[13px] text-[#666] leading-[19px] flex-1">
                This will mark the appointment as completed and notify the customer. This action cannot be undone.
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View className="px-5 pb-10 flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-[#F5F5F5] rounded-2xl py-4 items-center"
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text className="text-[14px] font-semibold text-[#666]">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-[#1A1A1A] rounded-2xl py-4 items-center"
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text className="text-[14px] font-bold text-white">Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
