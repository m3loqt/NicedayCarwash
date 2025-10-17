import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface VehicleCardProps {
  id: string;
  name: string;
  plateNumber: string;
  type: 'sedan' | 'suv' | 'pickup' | 'motorcycle';
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function VehicleCard({ 
  id, 
  name, 
  plateNumber, 
  type, 
  onEdit, 
  onDelete 
}: VehicleCardProps) {
  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'sedan':
        return require('../../../../assets/images/sedan.png');
      case 'suv':
        return require('../../../../assets/images/suv.png');
      case 'pickup':
        return require('../../../../assets/images/pickup.png');
      case 'motorcycle':
        return require('../../../../assets/images/motorcycle_small.png');
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
      case 'motorcycle':
        return 'Motorcycle';
      default:
        return 'Vehicle';
    }
  };

  return (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-md mx-4">
      <View className="flex-row items-center">
        {/* Vehicle Icon */}
        <View className="w-16 h-16 bg-[#F9EF08] rounded-lg items-center justify-center mr-4">
          <Image 
            source={getVehicleIcon(type)}
            className="w-10 h-10"
            resizeMode="contain"
          />
        </View>

        {/* Vehicle Details */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 mb-1">{name}</Text>
          <Text className="text-sm text-gray-600">{plateNumber} - {getTypeLabel(type)}</Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row">
          <TouchableOpacity 
            className="w-8 h-8 bg-[#F9EF08] rounded-full items-center justify-center mr-2"
            onPress={onEdit}
          >
            <Ionicons name="pencil" size={16} color="black" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-8 h-8 bg-red-500 rounded-full items-center justify-center"
            onPress={onDelete}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
