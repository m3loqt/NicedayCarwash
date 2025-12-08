import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryHeader() {
  const insets = useSafeAreaInsets();
  
  return (
    <View className="flex flex-row items-center p-4 bg-white" style={{ marginTop: -insets.top, paddingTop: insets.top + 16 }}>
      <View className="w-8" />
      <Text className="flex-1 text-center text-2xl font-semibold text-[#1E1E1E]">My Bookings</Text>
      <View className="w-8" />
    </View>
  );
}
