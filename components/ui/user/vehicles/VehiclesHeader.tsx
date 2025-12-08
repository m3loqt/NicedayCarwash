import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VehiclesHeader() {
  const insets = useSafeAreaInsets();
  
  const handleBack = () => {
    router.back();
  };

  const handleAdd = () => {
    router.push('/user/add-vehicle');
  };

  return (
    <View className="flex flex-row items-center justify-between p-4 bg-white border-b border-gray-200" style={{ marginTop: -insets.top, paddingTop: insets.top + 16 }}>
      <View className="w-8" />
      
      <Text className="text-2xl font-semibold text-[#1E1E1E]">My Vehicles</Text>
      
      <TouchableOpacity 
        className="p-2 rounded-full border border-gray-300"
        onPress={handleAdd}
      >
        <Ionicons name="add" size={24} color="#1E1E1E" />
      </TouchableOpacity>
    </View>
  );
}
