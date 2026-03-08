import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface BayOptionsModalProps {
  visible: boolean;
  bayName: string;
  currentStatus: string;
  onClose: () => void;
  onSaveAvailability: (status: string) => void;
  onDelete: () => void;
}

export default function BayOptionsModal({
  visible,
  bayName,
  currentStatus,
  onClose,
  onSaveAvailability,
  onDelete,
}: BayOptionsModalProps) {
  const isAvailable = currentStatus === "available";
  const targetUnavailable = isAvailable;
  const title = targetUnavailable ? "Set as unavailable?" : "Set as available?";
  const message = targetUnavailable
    ? `${bayName} will be hidden from the schedule.`
    : `${bayName} will be available for bookings.`;
  const confirmText = targetUnavailable ? "Set unavailable" : "Set available";

  const handleConfirm = () => {
    onSaveAvailability(targetUnavailable ? "unavailable" : "available");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white rounded-t-xl px-5 pt-4 pb-8">
          <View className="items-center pb-2">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "Inter_700Bold" }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>
          <Text className="text-[#666] text-sm mb-6" style={{ fontFamily: "Inter_400Regular" }}>
            {message}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-[#FAFAFA] rounded-lg py-3 items-center"
              onPress={onDelete}
            >
              <Text className="text-red-600 font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
                Delete bay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-[#F9EF08] rounded-lg py-3 items-center"
              onPress={handleConfirm}
            >
              <Text className="text-[#1A1A1A] font-bold" style={{ fontFamily: "Inter_700Bold" }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
