import { ERROR_COLOR } from '@/components/ui/common/FieldError';
import { Text, View } from 'react-native';

// Plain section title used down the booking flow (plan, date, payment). Sentence case, one size,
// with an optional quiet note beside it such as "Optional", and an optional inline error line
// directly beneath it (text only, in the app's shared error red).
export default function SectionHeader({
  title,
  note,
  error,
}: {
  title: string;
  note?: string;
  error?: string;
}) {
  return (
    <View className="px-4 mt-7 mb-3">
      <View className="flex-row items-baseline">
        <Text className="text-[17px] font-bold text-[#1A1A1A]">{title}</Text>
        {!!note && <Text className="text-[13px] text-[#6B6B6B] ml-2">{note}</Text>}
      </View>
      {!!error && (
        <Text className="text-[13px] mt-1" style={{ color: ERROR_COLOR }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
