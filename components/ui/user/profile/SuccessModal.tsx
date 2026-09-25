import { AppButton } from '@/components/ui/common/AppButton';
import { Image, Modal, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

export default function SuccessModal({ visible, message, onDismiss }: SuccessModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        className="flex-1 bg-black/40 items-center justify-end"
        onPress={onDismiss}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white w-full rounded-t-xl items-center px-8 pt-10"
          style={{ paddingBottom: insets.bottom + 48 }}
        >
          {/* Handle bar */}
          <View className="w-10 h-1 rounded-full bg-[#E0E0E0] mb-8" />

          {/* Icon */}
          <Image
            source={require('../../../../assets/images/universalsuccess.png')}
            style={{ width: 160, height: 160, marginBottom: 24 }}
            resizeMode="contain"
          />

          {/* Message */}
          <Text className="text-[17px] font-bold text-[#1A1A1A] text-center mb-6">
            {message}
          </Text>

          <AppButton
            className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center"
            onPress={onDismiss}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">OK</Text>
          </AppButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
