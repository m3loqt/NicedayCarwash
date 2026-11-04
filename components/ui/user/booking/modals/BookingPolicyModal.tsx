import { AppButton } from '@/components/ui/common/AppButton';
import { BOOKING_FEE } from '@/lib/bookingFee';
import { formatPeso } from '@/lib/formatPeso';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The booking policy in short (it mirrors section 6 of the Terms), opened from the "Booking policy"
// button in the review header so the review screen itself stays light. It deliberately has no link to the full Terms screen: leaving
// the booking flow for another route drops the customer's review (back lands on Home).
const getRules = (fee: string): string[] => [
  `Pay the ${fee} booking fee within 15 minutes to hold your slot.`,
  'The branch confirms your booking after you pay.',
  `The ${fee} is refunded if the branch can't honor your booking.`,
  'No refund for no shows, or for arriving late without telling the branch.',
];

export default function BookingPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const rules = getRules(formatPeso(BOOKING_FEE));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="bg-white rounded-t-3xl">
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
            <Text className="text-[18px] font-bold text-[#1A1A1A]">Booking policy</Text>
            <AppButton onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#6B6B6B" />
            </AppButton>
          </View>

          {/* Rules */}
          <View className="px-5 pt-1">
            {rules.map((rule) => (
              <Text key={rule} className="text-[15px] leading-[22px] text-[#1A1A1A] mb-3">
                {rule}
              </Text>
            ))}
          </View>

          <View style={{ height: insets.bottom + 12 }} />
        </View>
      </View>
    </Modal>
  );
}
