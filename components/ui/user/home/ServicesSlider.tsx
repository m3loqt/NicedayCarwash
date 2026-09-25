import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/common/AppButton';
import { Image, ImageSourcePropType, Text, View } from 'react-native';

type ServiceCategory = {
  id: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Hero badge replacing the plain icon circle - already a self-contained circular graphic. */
  image?: ImageSourcePropType;
};

// Generic category shortcuts only - actual services/prices vary per branch and are
// shown in the booking flow itself, not invented here.
const categories: ServiceCategory[] = [
  { id: 1, name: 'Exterior', icon: 'water-outline', image: require('../../../../assets/images/exterior.png') },
  { id: 2, name: 'Interior', icon: 'sparkles-outline', image: require('../../../../assets/images/interior.png') },
  { id: 3, name: 'Engine', icon: 'car-sport-outline', image: require('../../../../assets/images/engine.png') },
  { id: 4, name: 'Detailing', icon: 'shield-checkmark-outline', image: require('../../../../assets/images/detail.png') },
];

export default function ServicesQuickAccess() {
  return (
    <View className="mt-6 px-5">
      <Text className="text-lg font-bold text-[#1A1A1A] mb-4">Our Services</Text>

      <View className="flex-row justify-between">
        {categories.map((category) => (
          <AppButton
            key={category.id}
            className="items-center"
            style={{ width: '23%' }}
            onPress={() => router.push('/user/(tabs)/book')}
          >
            {category.image ? (
              <Image source={category.image} style={{ width: 56, height: 56, borderRadius: 28 }} className="mb-2" />
            ) : (
              <View className="w-14 h-14 rounded-full bg-[#F9EF08] items-center justify-center mb-2">
                <Ionicons name={category.icon} size={24} color="#1A1A1A" />
              </View>
            )}
            <Text className="text-[12px] font-semibold text-[#1A1A1A]" numberOfLines={1}>
              {category.name}
            </Text>
          </AppButton>
        ))}
      </View>
    </View>
  );
}
