import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

type ServiceCategory = {
  id: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// Generic category shortcuts only - actual services/prices vary per branch and are
// shown in the booking flow itself, not invented here.
const categories: ServiceCategory[] = [
  { id: 1, name: 'Exterior', icon: 'water-outline' },
  { id: 2, name: 'Interior', icon: 'sparkles-outline' },
  { id: 3, name: 'Engine', icon: 'car-sport-outline' },
  { id: 4, name: 'Detailing', icon: 'shield-checkmark-outline' },
];

export default function ServicesQuickAccess() {
  return (
    <View className="mt-6 px-5">
      <Text className="text-lg font-bold text-[#1A1A1A] mb-4">Our Services</Text>

      <View className="flex-row justify-between">
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            className="items-center"
            style={{ width: '23%' }}
            onPress={() => router.push('/user/(tabs)/book')}
            activeOpacity={0.8}
          >
            <View className="w-14 h-14 rounded-full bg-[#F9EF08] items-center justify-center mb-2">
              <Ionicons name={category.icon} size={24} color="#1A1A1A" />
            </View>
            <Text className="text-[12px] font-semibold text-[#1A1A1A]" numberOfLines={1}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
