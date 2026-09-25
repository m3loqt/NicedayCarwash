import { AppButton } from '@/components/ui/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { Image, ImageSourcePropType, Modal, Pressable, Text, View } from 'react-native';

interface CenteredInfoModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** A hero illustration - takes priority over `icon` when both are given. */
  image?: ImageSourcePropType;
  icon?: keyof typeof Ionicons.glyphMap;
  buttonLabel?: string;
  onClose: () => void;
}

// Floating, centered card - distinct from AlertModal's bottom-sheet drawer, which is what every
// confirmation/error/warning dialog elsewhere in the app uses. Reserved for passive, one-off
// FYIs (like the push-notification reminder) that shouldn't borrow that drawer's "you need to
// deal with this" weight.
export default function CenteredInfoModal({
  visible,
  title,
  message,
  image,
  icon = 'information-circle',
  buttonLabel = 'Got it',
  onClose,
}: CenteredInfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/20 items-center justify-center px-8" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm items-center bg-white rounded-3xl px-6 py-7">
          {image ? (
            <Image source={image} style={{ width: 180, height: 163 }} resizeMode="contain" className="mb-2" />
          ) : (
            <View className="w-14 h-14 rounded-full bg-[#FFFBE0] items-center justify-center mb-4">
              <Ionicons name={icon} size={28} color="#8A7A00" />
            </View>
          )}

          <Text className="text-[17px] font-bold text-[#1A1A1A] text-center mb-2">{title}</Text>
          <Text className="text-[13px] text-[#666] text-center leading-[19px] mb-6">{message}</Text>

          <AppButton className="w-full bg-[#F9EF08] rounded-2xl py-3.5 items-center" onPress={onClose}>
            <Text className="text-[14px] font-bold text-[#1A1A00]">{buttonLabel}</Text>
          </AppButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
