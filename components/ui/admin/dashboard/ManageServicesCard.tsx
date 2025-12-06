import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface ManageServicesCardProps {
  onPress?: () => void;
}

export default function ManageServicesCard({ onPress }: ManageServicesCardProps) {
  return (
    <View className="px-4 mt-6">
      <TouchableOpacity
        className="bg-white rounded-xl p-4 flex-row items-center shadow-sm border border-gray-100"
        onPress={onPress}
      >
        <View className="bg-[#F9EF08] rounded-full p-3 mr-4">
          <MaterialIcons name="settings" size={24} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 text-base font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
            Manage Services
          </Text>
          <Text className="text-gray-900 text-sm font-normal mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
            Add new service or edit an existing one
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

