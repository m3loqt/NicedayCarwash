import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

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
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" className="flex-1 justify-center items-center">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          onPress={onClose} 
        />

        {/* Modal Content */}
        <View 
          className="bg-gray-50 rounded-3xl px-6 py-6 mx-6 w-[80%] max-w-sm relative z-10 border border-gray-200"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Close Button - Top Right */}
          <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Title - Centered and Bigger */}
          <View className="items-center mb-6 mt-2">
            <Text className="text-3xl font-bold text-[#1E1E1E]">
              State Reason
            </Text>
          </View>

          {/* Reason Options */}
          <View className="mb-6">
            {REASONS.map((reason, index) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  className={`bg-white rounded-xl py-2.5 px-4 mb-3 border-2 ${
                    isSelected ? 'border-[#F9EF08]' : 'border-transparent'
                  }`}
                  onPress={() => onReasonSelect(reason)}
                >
                  <Text className="text-base text-[#1E1E1E] font-normal">
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Finish Button */}
          <TouchableOpacity
            className="bg-[#F9EF08] rounded-xl py-4 items-center"
            onPress={onFinish}
            disabled={!selectedReason}
            style={{ opacity: selectedReason ? 1 : 0.5 }}
          >
            <Text className="text-base font-semibold text-white">
              Finish
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

