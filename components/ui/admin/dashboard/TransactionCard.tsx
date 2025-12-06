import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface TransactionCardProps {
  label: string;
  count: number;
  icon: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  isLarge?: boolean;
}

export default function TransactionCard({ label, count, icon, isLarge = false }: TransactionCardProps) {
  const renderIcon = () => {
    switch (icon) {
      case 'pending':
        return (
          <View className="bg-[#F9EF08] rounded-full relative items-center justify-center" style={{ width: 64, height: 64 }}>
            <Ionicons name="person" size={36} color="white" />
            <View className="absolute bottom-0 right-0 bg-[#F9EF08] rounded-full" style={{ width: 24, height: 24, borderWidth: 2, borderColor: 'white' }}>
              <Ionicons name="time" size={14} color="white" style={{ position: 'absolute', top: 2, left: 2 }} />
            </View>
          </View>
        );
      case 'ongoing':
        return <Ionicons name="hourglass" size={24} color="white" />;
      case 'completed':
        return <MaterialIcons name="assignment-turned-in" size={24} color="white" />;
      case 'cancelled':
        return <MaterialIcons name="assignment" size={24} color="white" />;
    }
  };

  if (isLarge) {
    return (
      <View className="bg-white rounded-xl p-4 flex-1 shadow-sm border border-gray-100">
        <Text className="text-gray-900 text-sm font-normal mb-2" style={{ fontFamily: 'Inter_400Regular' }}>
          {label}
        </Text>
        <Text className="text-gray-900 text-4xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
          {count}
        </Text>
        <View className="mt-4 items-center">{renderIcon()}</View>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-gray-900 text-xs font-normal mb-1" style={{ fontFamily: 'Inter_400Regular' }}>
            {label}
          </Text>
          <Text className="text-gray-900 text-2xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
            {count}
          </Text>
        </View>
        {renderIcon()}
      </View>
    </View>
  );
}

