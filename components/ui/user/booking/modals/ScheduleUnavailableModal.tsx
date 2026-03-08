import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface ScheduleUnavailableModalProps {
  visible: boolean;
  reason: string;
  branchSchedule: { openTime: string; closeTime: string } | null;
  onClose: () => void;
}

export default function ScheduleUnavailableModal({
  visible,
  branchSchedule,
  onClose,
}: ScheduleUnavailableModalProps) {
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
            <Text className="text-[17px] font-bold text-[#1A1A1A]">Date Not Available</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <View className="h-[0.5px] bg-[#F0F0F0]" />

          {/* Body */}
          <View className="px-5 pt-5 pb-3">
            <Text className="text-[14px] text-[#666] leading-[20px]">
              Sorry, the branch is closed on the selected date.
            </Text>

            {branchSchedule && (
              <View className="flex-row items-center mt-3">
                <Ionicons name="time-outline" size={15} color="#999" />
                <Text className="text-[13px] text-[#999] ml-1.5">
                  Store Hours: {branchSchedule.openTime} – {branchSchedule.closeTime}
                </Text>
              </View>
            )}
          </View>

          {/* Button */}
          <View className="px-5 pb-10 pt-3">
            <TouchableOpacity
              className="bg-[#F9EF08] rounded-2xl py-4 items-center"
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text className="text-[14px] font-bold text-[#1A1A1A]">Try Another Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

