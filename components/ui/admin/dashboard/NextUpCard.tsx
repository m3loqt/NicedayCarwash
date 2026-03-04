import { Text, View } from 'react-native';

const CARD_YELLOW = '#F9EF08';

export interface NextUpItem {
  appointmentId: string;
  timeLabel: string;
  vehicleLabel: string;
  amountFormatted: string;
}

interface NextUpCardProps {
  items: NextUpItem[];
}

export default function NextUpCard({ items }: NextUpCardProps) {
  if (items.length === 0) {
    return (
      <View className="px-6 mt-3">
        <View
          style={{ backgroundColor: CARD_YELLOW }}
          className="rounded-md p-6"
        >
          <Text className="text-[#1E1E1E] text-lg font-bold mb-1" style={{ fontFamily: 'Inter_700Bold' }}>
            Next up
          </Text>
          <Text className="text-gray-600 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>
            No upcoming appointments today
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="px-6 mt-3">
      <View
        style={{ backgroundColor: CARD_YELLOW }}
        className="rounded-md overflow-hidden"
      >
        <View className="px-4 pt-6 pb-3">
          <Text className="text-[#1E1E1E] text-lg font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
            Next up
          </Text>
        </View>
        {items.map((item, index) => (
          <View
            key={item.appointmentId}
            className="px-4 py-5 flex-row justify-between items-center"
          >
            <View className="flex-1">
              <Text className="text-[#1E1E1E] font-semibold" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
                {item.timeLabel}
              </Text>
              <Text className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                {item.vehicleLabel}
              </Text>
            </View>
            <Text className="text-[#1E1E1E] font-bold ml-2" style={{ fontFamily: 'Inter_700Bold', fontSize: 16 }}>
              {item.amountFormatted}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
