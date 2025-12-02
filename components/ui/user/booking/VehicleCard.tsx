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
  return (
    <View className="bg-white rounded-xl px-5 py-4 flex-row items-center shadow-sm">
      {/* ICON */}
      <Image source={getVehicleIcon(type)} className="w-10 h-10" resizeMode="contain" />

      {/* TEXT */}
      <View className="ml-4 flex-1">
        <Text className="text-lg font-semibold text-gray-800">{name}</Text>
        <Text className="text-gray-500">{plateNumber}</Text>
      </View>

      {/* SELECT CIRCLE */}
      <View
        className={`w-6 h-6 rounded-full border-2 ${
          selected ? "border-[#F9EF08]" : "border-gray-300"
        } items-center justify-center`}
      >
        {selected && (
          <View className="w-3 h-3 rounded-full bg-[#F9EF08]" />
        )}
      </View>
    </View>
  );
}
