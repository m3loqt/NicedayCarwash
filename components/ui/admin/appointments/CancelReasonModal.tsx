import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export type CancelReason = 'Washer Unavailable' | 'Service Unavailable' | 'Power Interruption' | 'Late arrival';

interface CancelReasonModalProps {
  visible: boolean;
  selectedReason: CancelReason | null;
  onReasonSelect: (reason: CancelReason) => void;
  onClose: () => void;
  onFinish: () => void;
}

const REASONS: CancelReason[] = [
  'Washer Unavailable',
  'Service Unavailable',
  'Power Interruption',
  'Late arrival',
];

export default function CancelReasonModal({
  visible,
  selectedReason,
  onReasonSelect,
  onClose,
  onFinish,
}: CancelReasonModalProps) {
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
            <Text className="text-[17px] font-bold text-[#1A1A1A]">Cancel Booking</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <View className="h-[0.5px] bg-[#F0F0F0]" />

          {/* Body */}
          <View className="px-5 pt-4 pb-3">
            <Text className="text-[13px] text-[#999] mb-4">
              Select a reason for cancelling this booking.
            </Text>

            {REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  onPress={() => onReasonSelect(reason)}
                  className={`flex-row items-center px-4 py-3.5 rounded-2xl mb-2 ${
                    isSelected ? 'bg-[#FAFAFA] border border-[#D4D4D4]' : 'bg-[#FAFAFA]'
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                      isSelected ? 'border-[#F9EF08]' : 'border-[#D4D4D4]'
                    }`}
                  >
                    {isSelected && (
                      <View className="w-2.5 h-2.5 rounded-full bg-[#F9EF08]" />
                    )}
                  </View>
                  <Text className="text-[13px] font-medium text-[#1A1A1A]">{reason}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm button */}
          <View className="px-5 pb-10 pt-2">
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${
                selectedReason ? 'bg-[#F9EF08]' : 'bg-[#F5F5F5]'
              }`}
              onPress={onFinish}
              disabled={!selectedReason}
              activeOpacity={0.85}
            >
              <Text
                className={`text-[14px] font-bold ${
                  selectedReason ? 'text-[#1A1A1A]' : 'text-[#BDBDBD]'
                }`}
              >
                Confirm Cancellation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
