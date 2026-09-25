import { Ionicons } from "@expo/vector-icons";
import { AppButton } from '@/components/ui/common/AppButton';
import { Modal, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AvailabilityConfirmModalProps {
  visible: boolean;
  type: "service" | "addon";
  itemName: string;
  enable: boolean; // true = "Enable ...?", false = "Disable ...?"
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function AvailabilityConfirmModal({
  visible,
  type,
  itemName,
  enable,
  onClose,
  onConfirm,
  loading = false,
}: AvailabilityConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const label = type === "service" ? "service" : "add-on";
  const title = enable ? `Enable ${label}?` : `Disable ${label}?`;
  const message = enable
    ? `${itemName} will be available for customers.`
    : `${itemName} will be hidden from customers.`;
  const confirmText = enable ? "Enable" : "Disable";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-xl px-5 pt-4" style={{ paddingBottom: insets.bottom + 32 }}>
          <View className="items-center pb-2">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "Inter_700Bold" }}>
              {title}
            </Text>
            <AppButton onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#999" />
            </AppButton>
          </View>
          <Text className="text-[#666] text-sm mb-6" style={{ fontFamily: "Inter_400Regular" }}>
            {message}
          </Text>
          <View className="flex-row gap-3">
            <AppButton
              className="flex-1 bg-[#FAFAFA] rounded-lg py-3 items-center"
              onPress={onClose}
              disabled={loading}
            >
              <Text className="text-[#1E1E1E] font-semibold" style={{ fontFamily: "Inter_600SemiBold" }}>
                Cancel
              </Text>
            </AppButton>
            <AppButton
              className="flex-1 bg-[#F9EF08] rounded-lg py-3 items-center"
              onPress={onConfirm}
              disabled={loading}
            >
              <Text className="text-[#1A1A1A] font-bold" style={{ fontFamily: "Inter_700Bold" }}>
                {loading ? "..." : confirmText}
              </Text>
            </AppButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
