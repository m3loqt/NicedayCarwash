import { Image, ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';

interface VehicleCardProps {
  id: string;
  name: string;
  plateNumber: string;
  type: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const vehicleConfig: Record<string, { image: ImageSourcePropType; label: string }> = {
  sedan: { image: require('../../../../assets/images/sedan.png'), label: 'Sedan' },
  suv: { image: require('../../../../assets/images/suv.png'), label: 'SUV' },
  pickup: { image: require('../../../../assets/images/pickup.png'), label: 'Pickup' },
  'motorcycle-small': { image: require('../../../../assets/images/motosmall.png'), label: 'Motorcycle (S)' },
  'motorcycle-large': { image: require('../../../../assets/images/motobig.png'), label: 'Motorcycle (L)' },
};

const defaultConfig = { image: require('../../../../assets/images/sedan.png'), label: 'Vehicle' };

export default function VehicleCard({
  name,
  plateNumber,
  type,
  onEdit,
}: VehicleCardProps) {
  const config = vehicleConfig[type] || defaultConfig;

  return (
    <TouchableOpacity
      className="bg-[#FAFAFA] rounded-2xl mx-5 mb-3 px-5 py-5 items-center border border-[#EEEEEE]"
      onPress={onEdit}
      activeOpacity={0.7}
    >
      <Image
        source={config.image}
        style={{ width: 80, height: 50 }}
        resizeMode="contain"
      />
      <Text className="text-[14px] font-bold text-[#1A1A1A] mt-3">{config.label}</Text>
      <Text className="text-[13px] text-[#999] mt-1">{name} {plateNumber}</Text>
    </TouchableOpacity>
  );
}
