import { Text, View } from 'react-native';

interface LegendProps {
  className?: string;
}

/**
 * Legend component displaying Available and Unavailable status indicators
 * Used in SelectBayModal to show bay status meanings
 */
export default function Legend({ className = '' }: LegendProps) {
  return (
    <View className={`mb-4 items-center ${className}`}>
      <Text className="text-base text-gray-600 mb-2" style={{ fontFamily: 'Inter_600SemiBold' }}>
        Legend
      </Text>
      <View className="flex-row items-center justify-center gap-4">
        {/* Available Indicator */}
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-[#F9EF08] mr-2" />
          <Text className="text-lg text-[#F9EF08]" style={{ fontFamily: 'Inter_400Regular' }}>
            Available
          </Text>
        </View>
        
        {/* Unavailable Indicator */}
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-gray-300 mr-2" />
          <Text className="text-lg text-gray-500" style={{ fontFamily: 'Inter_400Regular' }}>
            Unavailable
          </Text>
        </View>
      </View>
    </View>
  );
}
