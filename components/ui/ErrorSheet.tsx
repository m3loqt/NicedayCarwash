import { AppButton } from '@/components/ui/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { Image, ImageSourcePropType, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ErrorSheetProps {
  visible: boolean;
  title: string;
  message: string;
  /** Hero illustration, ~160 wide. Falls back to a plain icon badge when omitted. */
  illustration?: ImageSourcePropType;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  onClose: () => void;
}

// Reusable bottom sheet for system-level failures (network, server, unknown) - distinct from the
// inline field errors and CredentialErrorBanner used for validation/wrong-credential cases, which
// don't warrant this heavier "something went wrong, retry?" treatment.
//
// TODO: pass illustration={require('.../assets/images/error-universal.png')} once that asset is
// added to the project - it doesn't exist yet, so this falls back to a plain icon badge.
export default function ErrorSheet({
  visible,
  title,
  message,
  illustration,
  primaryLabel = 'Try again',
  onPrimaryPress,
  secondaryLabel = 'Cancel',
  onSecondaryPress,
  onClose,
}: ErrorSheetProps) {
  const handlePrimary = () => {
    onClose();
    onPrimaryPress?.();
  };
  const handleSecondary = () => {
    onClose();
    onSecondaryPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <SafeAreaView edges={['bottom']} className="bg-white rounded-t-3xl">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          <View className="px-6 pt-3 pb-2 items-center">
            {illustration ? (
              <Image source={illustration} style={{ width: 160, height: 160 }} resizeMode="contain" />
            ) : (
              <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-2">
                <Ionicons name="alert-circle-outline" size={30} color="#999" />
              </View>
            )}
            <Text className="text-[18px] font-inter-semibold tracking-tight text-[#1A1A1A] text-center mt-2 mb-2">
              {title}
            </Text>
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#666] text-center leading-5 px-2">
              {message}
            </Text>
          </View>

          <View className="px-6 pt-4 pb-8" style={{ gap: 10 }}>
            <AppButton className="bg-[#F9EF08] rounded-2xl py-4 items-center" onPress={handlePrimary}>
              <Text className="text-[14px] font-inter-bold tracking-tight text-[#1A1A00]">{primaryLabel}</Text>
            </AppButton>
            <AppButton className="bg-[#F5F5F5] rounded-2xl py-4 items-center" onPress={handleSecondary}>
              <Text className="text-[14px] font-inter-semibold tracking-tight text-[#1A1A1A]">{secondaryLabel}</Text>
            </AppButton>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
