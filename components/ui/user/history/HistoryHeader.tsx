import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function HistoryHeader() {
  return (
    <View className="flex flex-row items-center p-4 bg-white border-b border-gray-200">
      <TouchableOpacity className="p-2 rounded-full border border-gray-300">
        <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
      </TouchableOpacity>
      <Text className="flex-1 text-center text-xl font-bold text-[#1E1E1E]">History</Text>
      <View className="w-8" />
    </View>
  );
}
