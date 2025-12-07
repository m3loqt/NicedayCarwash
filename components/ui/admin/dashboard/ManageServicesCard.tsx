import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface ManageServicesCardProps {
  onPress?: () => void;
}

export default function ManageServicesCard({ onPress }: ManageServicesCardProps) {
  return (
    <View className="px-6 mt-2">
      <TouchableOpacity
        className="bg-white rounded-md p-3 flex-row items-center shadow-sm border border-gray-100"
        onPress={onPress}
      >
        <View className="bg-[#F9EF08] rounded-lg p-3 mr-3">
          <MaterialIcons name="settings" size={24} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-[#1E1E1E] text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
            Manage Services
          </Text>
          <Text className="text-gray-500 text-sm font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
            Add new service or edit an existing one
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#1E1E1E" />
      </TouchableOpacity>
    </View>
  );
}

