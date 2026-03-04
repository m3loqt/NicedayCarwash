import { Text, View } from 'react-native';

export default function PaymentBadge() {
  return (
    <View className="bg-amber-100 px-3 py-1 rounded-full">
      <Text className="text-amber-700 text-xs font-semibold">Payment Required</Text>
    </View>
  );
}

