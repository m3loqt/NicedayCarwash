import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';

interface AppointmentsSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function AppointmentsSearchBar({
  searchQuery,
  onSearchChange,
}: AppointmentsSearchBarProps) {
  return (
    <View className="bg-white border border-[#EEEEEE] rounded-full px-3 py-2 flex-row items-center mx-4 mt-4">
      <Ionicons name="search" size={20} color="#666" />
      <TextInput
        placeholder="Search transaction"
        placeholderTextColor="#666"
        className="flex-1 ml-2 text-[14px] text-[#333]"
        value={searchQuery}
        onChangeText={onSearchChange}
      />
    </View>
  );
}

