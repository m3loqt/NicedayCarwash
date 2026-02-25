import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

type Service = {
  id: number;
  name: string;
  description: string;
  price: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const services: Service[] = [
  {
    id: 1,
    name: 'Exterior Wash',
    description: 'Foam wash & high pressure rinse',
    price: '₱150',
    icon: 'water-outline',
  },
  {
    id: 2,
    name: 'Full Detail',
    description: 'Deep interior & exterior clean',
    price: '₱850',
    icon: 'sparkles-outline',
  },
  {
    id: 3,
    name: 'Engine Wash',
    description: 'Safe degreasing & rinse',
    price: '₱350',
    icon: 'car-sport-outline',
  },
  {
    id: 4,
    name: 'Ceramic Coat',
    description: 'Long lasting paint protection',
    price: '₱2,500',
    icon: 'shield-checkmark-outline',
  },
];

export default function ServicesSection() {
  const handleAddService = (service: Service) => {
    console.log('Add service:', service.name);
  };

  return (
    <View className="mt-8 px-5">
      {/* Section header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-[#1A1A1A]">Our Services</Text>
        <TouchableOpacity
          className="border border-[#D4A017] rounded-full px-4 py-1.5"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-[13px] font-semibold text-[#D4A017]">Top Rated</Text>
        </TouchableOpacity>
      </View>

      {/* 2-column grid */}
      <View className="flex-row flex-wrap justify-between">
        {services.map((service) => (
          <View
            key={service.id}
            className="bg-white rounded-2xl p-4 mb-3"
            style={{
              width: '48.5%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Icon */}
            <View className="w-11 h-11 rounded-xl bg-[#FFF8E1] items-center justify-center mb-4">
              <Ionicons name={service.icon} size={22} color="#D4A017" />
            </View>

            {/* Name + description */}
            <Text className="text-[15px] font-bold text-[#1A1A1A] mb-1" numberOfLines={1}>
              {service.name}
            </Text>
            <Text className="text-[12px] text-[#9CA3AF] mb-4" numberOfLines={1}>
              {service.description}
            </Text>

            {/* Price + add button */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[15px] font-bold text-[#D4A017]">
                {service.price}
              </Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-[#F2F2F2] items-center justify-center"
                onPress={() => handleAddService(service)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="add" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
