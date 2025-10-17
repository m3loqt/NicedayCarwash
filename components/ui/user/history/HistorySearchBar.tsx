import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';

export default function HistorySearchBar() {
  return (
    <View className="bg-white rounded-xl px-4 py-3 flex-row items-center shadow mx-4 mt-4">
      <Ionicons name="search" size={20} color="#9CA3AF" />
      <TextInput 
        placeholder="Search transaction"
        placeholderTextColor="#9CA3AF"
        className="flex-1 ml-3 text-gray-800"
      />
    </View>
  );
}

