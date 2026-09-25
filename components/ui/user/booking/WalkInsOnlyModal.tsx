import { AppButton } from '@/components/ui/common/AppButton';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WalkInsOnlyModalProps {
  visible: boolean;
  onClose: () => void;
}

const MESSAGE =
  'This branch is not accepting online reservations right now, but is still open for walk-in customers.';

// Purpose-built bottom sheet for the "branch not accepting reservations" case - same sheet shape
// as AlertModal, but with the walkin.png illustration instead of a generic icon, and a "Got it"
// button instead of the small corner X (a bigger, easier target for a message worth acknowledging).
export default function WalkInsOnlyModal({ visible, onClose }: WalkInsOnlyModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <SafeAreaView edges={['bottom']} className="bg-white rounded-t-3xl">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          <View className="px-6 pt-3 pb-2 items-center">
            <Image
              source={require('../../../../assets/images/walkin.png')}
              style={{ width: 160, height: 160 }}
              resizeMode="contain"
            />
            <Text className="text-[18px] font-inter-semibold tracking-tight text-[#1A1A1A] text-center mt-2 mb-2">
              Walk-ins Only
            </Text>
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#666] text-center leading-5 px-2">
              {MESSAGE}
            </Text>
          </View>

          <View className="px-6 pt-4 pb-8">
            <AppButton className="bg-[#F9EF08] rounded-2xl py-4 items-center" onPress={onClose}>
              <Text className="text-[14px] font-inter-bold tracking-tight text-[#1A1A00]">Got it</Text>
            </AppButton>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
