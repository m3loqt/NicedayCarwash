import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import VehicleCard from './VehicleCard';
import VehicleSuccessPanel from './VehicleSuccessPanel';

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
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const handleEdit = (vehicleId: string) => {
    // Navigate to edit vehicle screen
    router.push('/user/edit-vehicle');
  };

  const handleDelete = (vehicleId: string) => {
    // TODO: Implement actual delete logic
    console.log('Delete vehicle:', vehicleId);
    
    // Show delete success panel
    setShowDeleteSuccess(true);
  };

  const handleDeleteSuccessContinue = () => {
    // Hide success panel and refresh list
    setShowDeleteSuccess(false);
    // TODO: Remove vehicle from list or refresh data
  };

  // Show delete success panel if needed
  if (showDeleteSuccess) {
    return (
      <VehicleSuccessPanel
        message="Vehicle has been removed successfully!"
        onContinue={handleDeleteSuccessContinue}
        iconType="delete"
      />
    );
  }

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
