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
  reason,
  branchSchedule,
  onClose,
}: ScheduleUnavailableModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl px-6 py-8 mx-6 max-w-sm w-full relative">
          {/* Close Icon - Top Right */}
          <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          
          {/* Calendar Icon */}
          <View className="items-center mb-6">
            <View className="relative mb-4">
              {/* Calendar body - light gray */}
              <View className="w-20 h-20 bg-gray-200 rounded-lg items-center justify-center">
                {/* Calendar top bar - yellow theme */}
                <View className="absolute top-0 left-0 right-0 h-6 bg-[#F9EF08] rounded-t-lg" />
                {/* Calendar grid - white squares */}
                <View className="flex-row flex-wrap justify-center items-center mt-2 px-2">
                  {Array.from({ length: 12 }, (_, i) => (
                    <View
                      key={i}
                      className="w-2 h-2 bg-white rounded-sm m-0.5"
                    />
                  ))}
                </View>
              </View>
            </View>
            
            {/* Main Heading */}
            <Text className="text-2xl font-bold text-[#333] mb-2">
              Date not available!
            </Text>
            
            {/* Sub-heading */}
            <Text className="text-base text-gray-600 text-center">
              Sorry! The store is closed on this date
            </Text>
          </View>
          
          {/* Store Hours */}
          {branchSchedule && (
            <View className="flex-row items-center justify-center mb-6">
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text className="text-sm text-gray-600 ml-2">
                Store Hours: {branchSchedule.openTime} - {branchSchedule.closeTime}
              </Text>
            </View>
          )}
          
          {/* Action Button */}
          <TouchableOpacity
            className="bg-[#F9EF08] py-4 rounded-xl items-center"
            onPress={onClose}
          >
            <Text className="text-[#1E1E1E] text-base font-semibold">
              Try another date
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

