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
    <View className="bg-[#FAFAFA] rounded-2xl px-4 py-3 flex-row items-center mx-4 mt-4">
      <Ionicons name="search" size={18} color="#9CA3AF" />
      <TextInput
        placeholder="Search transaction"
        placeholderTextColor="#C4C4C4"
        className="flex-1 ml-3 text-[#1A1A1A]"
        value={searchQuery}
        onChangeText={onSearchChange}
        style={{ fontSize: 13 }}
      />
    </View>
  );
}

