import { Text, View } from 'react-native';
import { LazyIcon } from './LazyIcon';

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
          <View className="relative justify-center">
            <LazyIcon type="ionicons" name="person" size={90} color="#F9EF08" />
          </View>
        );
      case 'ongoing':
        return <LazyIcon type="ionicons" name="hourglass" size={24} color="#F9EF08" />;
      case 'completed':
        return <LazyIcon type="material" name="assignment-turned-in" size={24} color="#F9EF08" />;
      case 'cancelled':
        return <LazyIcon type="material" name="assignment" size={24} color="#F9EF08" />;
    }
  };

  if (isLarge) {
    return (
      <View className="bg-white rounded-md p-4 shadow-sm border border-gray-100" style={{ flex: 1 }}>
        <Text className="text-gray-500 text-base font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
          {label}
        </Text>
        <Text className="text-[#1E1E1E] font-bold" style={{ fontFamily: 'Inter_700Bold', fontSize: 48 }}>
          {count}
        </Text>
        <View style={{ position: 'absolute', bottom: -8, right: -4 }}>
          {renderIcon()}
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-md px-3 py-2 mr-2 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-end" style={{ position: 'relative' }}>
        <View className="flex-1">
          <Text className="text-gray-500 text-sm font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
            {label}
          </Text>
          <Text className="text-[#1E1E1E] text-2xl font-semibold" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {count}
          </Text>
        </View>
        <View style={{ position: 'absolute', bottom: -10, right: -8 }}>
          {renderIcon()}
        </View>
      </View>
    </View>
  );
}

