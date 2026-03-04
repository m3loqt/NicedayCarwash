import { BlurView } from 'expo-blur';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

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
          {/* <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity> */}

          {/* Title - Centered and Bigger */}
          <View className="items-center mb-6 mt-2">
            <Text className="text-3xl font-bold text-[#1E1E1E]">
              Complete Appointment
            </Text>
          </View>

          {/* Confirmation Message */}
          <View className="mb-6">
            <Text className="text-base text-[#1E1E1E] font-normal text-center">
              Are you sure you want to mark this appointment as completed?
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 border border-gray-300 rounded-xl py-4 items-center bg-white"
              onPress={onClose}
            >
              <Text className="text-base font-semibold text-gray-700">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-[#F9EF08] rounded-xl py-4 items-center"
              onPress={onConfirm}
            >
              <Text className="text-base font-semibold text-white">
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

