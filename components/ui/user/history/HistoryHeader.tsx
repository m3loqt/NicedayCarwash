import { Text, View } from 'react-native';

export default function HistoryHeader() {
  const insets = useSafeAreaInsets();
  
  return (
    <View className="px-5 pt-4 pb-6">
      <Text className="text-3xl font-bold text-[#1A1A1A]">Bookings</Text>
    </View>
  );
}
