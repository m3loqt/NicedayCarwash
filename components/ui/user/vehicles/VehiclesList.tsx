import { ScrollView, View } from 'react-native';
import VehicleCard from './VehicleCard';

const mockVehicles = [
  {
    id: '1',
    name: 'Honda Civic',
    plateNumber: 'ND123-2321',
    type: 'sedan' as const
  },
  {
    id: '2',
    name: 'Ford Ranger',
    plateNumber: 'ND123-2321',
    type: 'pickup' as const
  },
  {
    id: '3',
    name: 'Geely Coolray',
    plateNumber: 'ND123-2321',
    type: 'suv' as const
  },
  {
    id: '4',
    name: 'Honda Rebel',
    plateNumber: 'ND123-529',
    type: 'motorcycle' as const
  }
];

export default function VehiclesList() {
  const handleEdit = (vehicleId: string) => {
    console.log('Edit vehicle:', vehicleId);
  };

  const handleDelete = (vehicleId: string) => {
    console.log('Delete vehicle:', vehicleId);
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="pt-4"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {mockVehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            id={vehicle.id}
            name={vehicle.name}
            plateNumber={vehicle.plateNumber}
            type={vehicle.type}
            onEdit={() => handleEdit(vehicle.id)}
            onDelete={() => handleDelete(vehicle.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
