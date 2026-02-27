import { Ionicons } from '@expo/vector-icons';
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

const ICONS: Record<AlertType, React.ComponentProps<typeof Ionicons>['name']> = {
  error: 'close-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
};

interface AlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  confirmLabel?: string;
}

export default function AlertModal({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  confirmLabel = 'Got it',
}: AlertModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-center items-center px-8"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      >
        <Pressable onPress={() => {}} className="w-full">
          <View
            className="bg-white rounded-3xl px-6 pt-7 items-center"
            style={{ paddingBottom: Platform.OS === 'ios' ? 24 : 20 }}
          >
            {/* Icon */}
            <View className="w-14 h-14 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-4">
              <Ionicons name={ICONS[type]} size={28} color="#1A1A1A" />
            </View>

            {/* Title */}
            <Text className="text-[15px] font-bold text-[#1A1A1A] text-center mb-1.5">
              {title}
            </Text>

            {/* Message */}
            <Text className="text-[12px] text-[#999] text-center leading-5 mb-6">
              {message}
            </Text>

            {/* Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              className="w-full bg-[#F9EF08] rounded-2xl py-3.5 items-center"
            >
              <Text className="text-[14px] font-bold text-[#1A1A00]">
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
