import { Image, Text, View } from "react-native";

export default function VehicleCard({
  name,
  plateNumber,
  type,
  selected,
}: any) {
  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'sedan':
        return require('../../../../assets/images/sedan.png');
      case 'suv':
        return require('../../../../assets/images/suv.png');
      case 'pickup':
        return require('../../../../assets/images/pickup.png');
      case 'motorcycle-small':
        return require('../../../../assets/images/motorcycle_small.png');
      case 'motorcycle-large':
        return require('../../../../assets/images/motorcycle_large.png');
      default:
        return require('../../../../assets/images/sedan.png');
    }
  };

  const getTypeLabel = (vehicleType: string) => {
    switch (vehicleType) {
      case 'sedan':
        return 'Sedan';
      case 'suv':
        return 'SUV';
      case 'pickup':
        return 'Pickup';
      case 'motorcycle-small':
      case 'motorcycle-large':
        return 'Motorcycle';
      default:
        return 'Vehicle';
    }
  };

  return (
    <View className="bg-white rounded-xl px-5 py-4 flex-row items-center shadow-sm">
      {/* ICON - Yellow vehicle icon */}
      <View className="w-12 h-12 items-center justify-center">
        <Image source={getVehicleIcon(type)} className="w-10 h-10" resizeMode="contain" style={{ tintColor: '#F9EF08' }} />
      </View>

      {/* Vertical separator line */}
      <View className="h-12 mx-4" style={{ width: 0.5, backgroundColor: 'rgba(0, 0, 0, 0.2)' }} />

      {/* TEXT */}
      <View className="flex-1">
        <Text className="text-lg font-bold text-[#1E1E1E]">{name}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{plateNumber} - {getTypeLabel(type)}</Text>
      </View>

      {/* SELECT CIRCLE - Radio button */}
      <View
        className={`w-6 h-6 rounded-full border-2 ${
          selected ? "border-[#F9EF08]" : "border-gray-300"
        } items-center justify-center`}
      >
        {selected && (
          <View className="w-3.5 h-3.5 rounded-full bg-[#F9EF08]" />
        )}
      </View>
    </View>
  );
}
