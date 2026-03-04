import { Text, TouchableOpacity, View } from 'react-native';
import { LazyIcon } from './LazyIcon';

interface TransactionCardProps {
  label: string;
  count: number;
  icon: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  isLarge?: boolean;
  onPress?: () => void;
}

export default function TransactionCard({ label, count, icon, isLarge = false, onPress }: TransactionCardProps) {
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

  const cardContent = isLarge ? (
    <>
      <Text className="text-gray-500 text-base font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
        {label}
      </Text>
      <Text className="text-[#1E1E1E] font-bold" style={{ fontFamily: 'Inter_700Bold', fontSize: 48 }}>
        {count}
      </Text>
      <View style={{ position: 'absolute', bottom: -8, right: -4 }}>
        {renderIcon()}
      </View>
    </>
  ) : (
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
  );

  if (isLarge) {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper
        className="bg-[#FAFAFA] rounded-md p-4"
        style={{ flex: 1 }}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        {cardContent}
      </Wrapper>
    );
  }

  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      className="bg-[#FAFAFA] rounded-md px-3 py-2 mr-2"
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {cardContent}
    </Wrapper>
  );
}
