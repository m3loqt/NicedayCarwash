import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function AppointmentsHeader() {
  return (
    <View className="flex flex-row items-center p-4 bg-white">
      <View className="w-10" />
      <Text className="flex-1 text-center text-xl font-bold text-[#1E1E1E]">Appointments</Text>
      <View className="w-10" />
    </View>
  );
}

