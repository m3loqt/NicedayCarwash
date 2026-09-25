import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/ui/common/AppButton';
import { Image, ImageSourcePropType, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VehicleSuccessPanelProps {
  message: string;
  onContinue: () => void;
  iconType?: 'success' | 'delete';
  /** Overrides the icon box with a hero illustration. */
  image?: ImageSourcePropType;
}

export default function VehicleSuccessPanel({
  message,
  onContinue,
  iconType = 'success',
  image,
}: VehicleSuccessPanelProps) {
  const isDelete = iconType === 'delete';

  // The caller only mounts this component while a success/delete state is actually showing, so
  // a constant `visible` is correct here - a real <Modal> is what guarantees this paints above
  // everything, including a persistent screen header rendered as a sibling wherever this
  // happens to be mounted (e.g. VehiclesList's delete-success used to sit under VehiclesHeader
  // without this, since it was just an ordinary in-flow view).
  return (
    <Modal visible animationType="fade">
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        {image ? (
          <Image source={image} style={{ width: 160, height: 160 }} resizeMode="contain" className="mb-3" />
        ) : (
          <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-5">
            <Ionicons
              name={isDelete ? 'trash-outline' : 'checkmark-circle-outline'}
              size={30}
              color={isDelete ? '#DC2626' : '#1A1A1A'}
            />
          </View>
        )}

        <Text className="text-[18px] font-bold text-[#1A1A1A] text-center mb-1.5">
          {isDelete ? 'Vehicle Removed' : 'Success'}
        </Text>

        <Text className="text-[12px] text-[#999] text-center mb-6 px-2">{message}</Text>

        <AppButton
          className="w-full bg-[#F9EF08] py-3.5 rounded-2xl items-center"
          onPress={onContinue}
        >
          <Text className="text-[14px] font-bold text-[#1A1A00]">Continue</Text>
        </AppButton>
      </SafeAreaView>
    </Modal>
  );
}
