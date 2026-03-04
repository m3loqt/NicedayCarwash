import { Text, TouchableOpacity, View } from 'react-native';
import { LazyIcon } from './LazyIcon';

interface ManageServicesCardProps {
  onPress?: () => void;
}

export default function ManageServicesCard({ onPress }: ManageServicesCardProps) {
  return (
    <View className="px-6 mt-2">
      <TouchableOpacity
        className="bg-[#FAFAFA] rounded-md p-3 flex-row items-center"
        onPress={onPress}
      >
        <View className="bg-[#F9EF08] rounded-lg p-3 mr-3" style={{ minWidth: 50, minHeight: 50, justifyContent: 'center', alignItems: 'center' }}>
          <LazyIcon type="material" name="settings" size={24} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-[#1E1E1E] text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
            Manage Services
          </Text>
          <Text className="text-gray-500 text-sm font-normal" style={{ fontFamily: 'Inter_400Regular' }}>
            Add new service or edit an existing one
          </Text>
        </View>
        <LazyIcon type="ionicons" name="chevron-forward" size={24} color="#1E1E1E" />
      </TouchableOpacity>
    </View>
  );
}

