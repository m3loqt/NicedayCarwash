import EditVehicle from '../../components/ui/user/vehicles/EditVehicle';

export default function EditVehicleScreen() {
  // TODO: Get vehicle data from route params or context
  const vehicleId = '1'; // This should come from route params
  const initialData = {
    name: 'Ford Ranger',
    plateNumber: 'ND-123-529',
    classification: {
      id: 'sedan',
      name: 'Sedan',
      icon: 'car-sport',
      examples: '(EX: Toyota Vios, Honda City, Toyota Corolla)'
    }
  };

  return <EditVehicle vehicleId={vehicleId} initialData={initialData} />;
}

